import { test, expect } from '@playwright/test'

const password = process.env.MEDICARE_TEST_PASSWORD

async function signIn(page, email, homePath) {
  test.skip(!password, 'Set MEDICARE_TEST_PASSWORD to run authenticated portal tests.')

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(new RegExp(`${homePath}$`))
}

async function checkRoutes(page, routes) {
  const runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))

  for (const path of routes) {
    const expectedUrl = new URL(path, page.url())
    await page.goto(path)
    const actualUrl = new URL(page.url())
    expect(actualUrl.pathname, `route pathname ${path}`).toBe(expectedUrl.pathname)
    expect(actualUrl.search, `route query ${path}`).toBe(expectedUrl.search)
    await expect(page.getByRole('main'), `main content on ${path}`).toBeVisible()
    await expect(page.locator('main h1'), `page heading on ${path}`).toBeVisible()

    const unnamedButtons = await page.locator('button:visible').evaluateAll(buttons =>
      buttons.filter(button => !(button.getAttribute('aria-label') || button.title || button.innerText.trim()))
        .map(button => button.outerHTML)
    )
    expect(unnamedButtons, `accessible button names on ${path}`).toEqual([])

    const unnamedFields = await page.locator('main input:visible:not([type="hidden"]), main select:visible, main textarea:visible').evaluateAll(fields =>
      fields.filter(field => !field.getAttribute('aria-label') && !field.getAttribute('aria-labelledby')
        && !field.labels?.length && !field.placeholder)
        .map(field => field.outerHTML)
    )
    expect(unnamedFields, `accessible field labels on ${path}`).toEqual([])
  }

  expect(runtimeErrors).toEqual([])
}

async function checkResponsiveRoutes(page, routes) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport)
    for (const path of routes) {
      await page.goto(path)
      await expect(page.locator('main h1'), `heading at ${viewport.width}px on ${path}`).toBeVisible()
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }))
      const overflowingElements = await page.locator('body *').evaluateAll(elements => elements
        .map(element => ({
          tag: element.tagName,
          className: typeof element.className === 'string' ? element.className : '',
          text: (element.innerText || '').trim().slice(0, 80),
          right: Math.round(element.getBoundingClientRect().right),
        }))
        .filter(element => element.right > window.innerWidth + 1)
        .sort((a, b) => b.right - a.right)
        .slice(0, 5))
      expect(dimensions.content, `horizontal overflow at ${viewport.width}px on ${path}`)
        .toBeLessThanOrEqual(dimensions.viewport + 1, JSON.stringify(overflowingElements))
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 })
}

test('login page renders without credentials', async ({ page }) => {
  const runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))

  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  expect(runtimeErrors).toEqual([])
})

test('doctor portal pages load and patient search filters results', async ({ page }) => {
  await signIn(page, 'doctor@medicare.ai', '/doctor/dashboard')
  const routes = [
    '/doctor/dashboard',
    '/doctor/patients',
    '/doctor/patients/1',
    '/doctor/consultations',
    '/doctor/consultations/10',
    '/doctor/prescriptions',
    '/doctor/prescriptions/new?patientId=1',
    '/doctor/reports',
    '/doctor/messages',
    '/doctor/settings',
  ]
  await checkRoutes(page, routes)
  await checkResponsiveRoutes(page, routes)

  await page.goto('/doctor/patients')
  await page.getByRole('textbox', { name: 'Search patients' }).fill('Sarah')
  await expect(page.getByRole('row').filter({ hasText: 'Sarah' })).toHaveCount(1)
  await expect(page.getByRole('row').filter({ hasText: 'John Doe' })).toHaveCount(0)

  await page.getByRole('textbox', { name: 'Search patients' }).clear()
  await page.getByLabel('Filter by status').selectOption('Follow-up')
  await expect(page.getByRole('row').filter({ hasText: 'Michael Brown' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Sarah Wilson' })).toHaveCount(0)

  await page.goto('/doctor/consultations')
  await page.getByRole('tab', { name: 'Upcoming' }).click()
  await expect(page.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('textbox', { name: 'Search consultations' }).fill('No such patient')
  await expect(page.getByText('No consultations here')).toBeVisible()

  await page.goto('/doctor/dashboard')
  await page.getByRole('button', { name: /Find a page/ }).click()
  await page.getByRole('textbox', { name: 'Command search' }).fill('Patients Directory')
  await page.getByText('Patients Directory', { exact: true }).click()
  await expect(page).toHaveURL(/\/doctor\/patients$/)

  await page.goto('/doctor/prescriptions')
  await page.getByLabel('Filter by status').selectOption('Finalized')
  await page.getByRole('textbox', { name: 'Search prescriptions' }).fill('RX-1001')
  await expect(page.getByText('RX-1001')).toBeVisible()

  await page.goto('/doctor/prescriptions/new?patientId=1')
  await page.getByRole('button', { name: 'Add medicine' }).click()
  await expect(page.locator('.med')).toHaveCount(2)
  await page.getByRole('button', { name: 'Remove medicine 2' }).click()
  await expect(page.locator('.med')).toHaveCount(1)
  await page.getByRole('button', { name: 'Preview' }).click()
  const previewDialog = page.getByRole('dialog', { name: 'Prescription preview' })
  await expect(previewDialog).toBeVisible()
  await previewDialog.getByRole('button', { name: 'Close' }).click()

  await page.goto('/doctor/reports')
  await page.getByLabel('Timeframe').selectOption('7d')
})

test('patient portal pages load and appointments show a consistent upcoming view', async ({ page }) => {
  await signIn(page, 'patient@medicare.ai', '/patient/dashboard')
  const routes = [
    '/patient/dashboard',
    '/patient/prescriptions',
    '/patient/medical-records',
    '/patient/visit-summaries',
    '/patient/lab-tests',
    '/patient/appointments',
    '/patient/medicine-reminders',
    '/patient/messages',
    '/patient/profile',
    '/patient/settings',
  ]
  await checkRoutes(page, routes)
  await checkResponsiveRoutes(page, routes)

  await page.goto('/patient/profile')
  await expect(page.getByRole('link', { name: 'Profile & Account' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Account Details' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Account Security' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Account', exact: true })).toHaveCount(0)
  await page.goto('/patient/account')
  await expect(page).toHaveURL(/\/patient\/profile$/)

  await page.goto('/patient/dashboard')
  await page.getByRole('link', { name: 'Book Appointment' }).click()
  await expect(page).toHaveURL(/\/patient\/appointments$/)
  await expect(page.getByRole('dialog', { name: 'Schedule Doctor Appointment' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.goto('/patient/appointments')
  await expect(page.getByRole('button', { name: /Upcoming \(\d+\)/ })).toBeVisible()
  await page.getByRole('button', { name: /Past Visits/ }).click()
  await page.getByRole('button', { name: /All Records/ }).click()
  await page.getByRole('button', { name: /Upcoming/ }).click()
  await page.getByRole('button', { name: 'Book New Appointment' }).click()
  const appointmentDialog = page.getByRole('dialog', { name: 'Schedule Doctor Appointment' })
  await expect(appointmentDialog).toBeVisible()
  expect(await appointmentDialog.locator('form').evaluate(form => form.checkValidity())).toBe(false)
  await appointmentDialog.getByRole('button', { name: 'Confirm Appointment' }).click()
  await expect(appointmentDialog).toBeVisible()
  await appointmentDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(appointmentDialog).toBeHidden()

  await page.goto('/patient/prescriptions')
  await page.getByRole('button', { name: 'Active Regimen' }).click()
  await page.getByRole('searchbox', { name: 'Search prescriptions' }).fill('no matching medicine')
  await expect(page.getByText('No prescriptions found')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search prescriptions' }).clear()
  await page.getByRole('button', { name: 'All Prescriptions' }).click()
  await page.getByRole('button', { name: 'View & Print Copy' }).first().click()
  const prescriptionDialog = page.getByRole('dialog')
  await expect(prescriptionDialog).toBeVisible()
  await prescriptionDialog.getByRole('button', { name: 'Close' }).first().click()

  await page.goto('/patient/lab-tests')
  await page.getByRole('button', { name: 'Book Diagnostic Test' }).click()
  const labDialog = page.getByRole('dialog', { name: 'Schedule Diagnostic Lab Test' })
  await expect(labDialog).toBeVisible()
  expect(await labDialog.locator('form').evaluate(form => form.checkValidity())).toBe(false)
  await labDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.goto('/patient/medical-records')
  await page.getByRole('button', { name: /Immunizations/ }).click()
  await expect(page.getByRole('button', { name: /Immunizations/ })).toHaveClass(/on/)
  await page.getByRole('button', { name: /Allergies & Contraindications/ }).click()
  await page.getByRole('button', { name: 'Report New Allergy' }).click()
  const allergyDialog = page.getByRole('dialog', { name: 'Record Known Allergy or Drug Sensitivity' })
  await expect(allergyDialog).toBeVisible()
  expect(await allergyDialog.locator('form').evaluate(form => form.checkValidity())).toBe(false)
  await allergyDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.goto('/patient/medicine-reminders')
  await page.getByRole('button', { name: 'Add Custom Reminder' }).click()
  const reminderDialog = page.getByRole('dialog', { name: 'Add Medication Reminder' })
  await expect(reminderDialog).toBeVisible()
  expect(await reminderDialog.locator('form').evaluate(form => form.checkValidity())).toBe(false)
  await reminderDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
})

test('admin portal pages load and physician directory exposes credential fields', async ({ page }) => {
  await signIn(page, 'admin@medicare.ai', '/admin/dashboard')
  const routes = [
    '/admin/dashboard',
    '/admin/doctors',
    '/admin/patients',
    '/admin/hospitals',
    '/admin/prescriptions',
    '/admin/reports',
    '/admin/system-logs',
    '/admin/settings',
  ]
  await checkRoutes(page, routes)
  await checkResponsiveRoutes(page, routes)

  await page.goto('/admin/doctors')
  await expect(page.getByRole('columnheader', { name: 'License Number' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Experience' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Consultations' })).toBeVisible()
  await page.getByRole('combobox').nth(1).selectOption('Active')
  await page.getByRole('searchbox', { name: 'Search doctors' }).fill('no matching doctor')
  await expect(page.getByText('No physicians found')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search doctors' }).clear()
  await page.getByRole('combobox').nth(1).selectOption('All')
  await page.getByRole('button', { name: 'View', exact: true }).first().click()
  const physicianDialog = page.getByRole('dialog')
  await expect(physicianDialog).toBeVisible()
  await physicianDialog.getByRole('button', { name: 'Close', exact: true }).last().click()

  await page.getByRole('button', { name: 'Add / Invite Doctor' }).click()
  const addDoctorDialog = page.getByRole('dialog', { name: /Onboard New Physician/ })
  await expect(addDoctorDialog).toBeVisible()
  expect(await addDoctorDialog.locator('form').evaluate(form => form.checkValidity())).toBe(false)
  await addDoctorDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.goto('/admin/patients')
  await page.getByRole('searchbox', { name: 'Search patients' }).fill('no matching patient')
  await expect(page.getByText('No patients found')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search patients' }).clear()
  await page.getByRole('button', { name: 'Register Patient' }).click()
  const registerDialog = page.getByRole('dialog', { name: 'Register New Patient' })
  await expect(registerDialog).toBeVisible()
  expect(await registerDialog.locator('form').evaluate(form => form.checkValidity())).toBe(false)
  await registerDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.goto('/admin/hospitals')
  await page.getByRole('searchbox', { name: 'Search hospitals' }).fill('no matching hospital')
  await expect(page.getByText('No healthcare facilities found')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search hospitals' }).clear()
  await page.getByRole('button', { name: 'Add Healthcare Facility' }).click()
  const hospitalDialog = page.getByRole('dialog', { name: 'Connect Affiliated Healthcare Facility' })
  await expect(hospitalDialog).toBeVisible()
  expect(await hospitalDialog.locator('form').evaluate(form => form.checkValidity())).toBe(false)
  await hospitalDialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.goto('/admin/reports')
  await page.getByLabel('Timeframe').selectOption('7d')

  await page.goto('/admin/prescriptions')
  await page.locator('select').nth(0).selectOption('Verified Safe')
  await page.locator('select').nth(1).selectOption('Finalized')
  await page.getByRole('searchbox', { name: 'Search prescriptions audit' }).fill('no matching prescription')
  await expect(page.getByText('No audit entries matched')).toBeVisible()

  await page.goto('/admin/system-logs')
  await page.locator('select').nth(0).selectOption('ERROR')
  await page.getByRole('searchbox', { name: 'Search logs' }).fill('no matching log')
  await expect(page.getByText('No log events matched')).toBeVisible()
})

