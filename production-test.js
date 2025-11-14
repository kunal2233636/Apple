const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function login(driver) {
  await driver.get('http://localhost:3000/auth');
  await driver.findElement(By.xpath("//button[contains(text(),'Sign in with Google')]")).click();
  // The rest of the login flow will be handled by the user manually
}

(async function productionTest() {
  let driver;
  try {
    const options = new chrome.Options();
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await login(driver);

    // 1. Navigate to the Settings page
    await driver.wait(until.elementLocated(By.xpath("//a[@href='/settings']")), 30000);
    await driver.findElement(By.xpath("//a[@href='/settings']")).click();

    // 2. Click on the "Study Buddy" tab
    await driver.wait(until.elementLocated(By.xpath("//button[contains(text(),'Study Buddy')]")), 30000);
    await driver.findElement(By.xpath("//button[contains(text(),'Study Buddy')]")).click();

    // 3. Select "Google Gemini" as the provider
    await driver.wait(until.elementLocated(By.id('global-provider')), 30000);
    await driver.findElement(By.id('global-provider')).click();
    await driver.wait(until.elementLocated(By.xpath("//div[contains(text(),'gemini')]")), 30000);
    await driver.findElement(By.xpath("//div[contains(text(),'gemini')]")).click();

    // 4. Verify that the model dropdown contains the correct Gemini models
    const modelDropdown = await driver.findElement(By.id('global-model'));
    await modelDropdown.click();

    const geminiModels = [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ];

    for (const model of geminiModels) {
      const modelElement = await driver.wait(until.elementLocated(By.xpath(`//div[contains(text(),'${model}')]`)), 10000);
      assert.ok(await modelElement.isDisplayed(), `Model ${model} should be displayed`);
    }

    console.log('Production test passed!');
  } catch (error) {
    console.error('Production test failed:', error);
    if (driver) {
      console.log(await driver.getPageSource());
    }
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
})();
