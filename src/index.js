import puppeteer from 'puppeteer';
import { URL } from 'url';
import { launch } from 'puppeteer';
import lighthouse from 'lighthouse';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
dotenv.config();

const urlToTest = JSON.parse(process?.env?.urlToTest) || [];
const JWT = process?.env?.JWT;

// Puppeteer Cofig
const puppeteerOptions = {
  headless: 'new',
};

// Lighthouse config
const lighthouseConfig = {
  extends: 'lighthouse:default',
  settings: {
    emulatedFormFactor: 'desktop', // Can be desktop or mobile
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
};

async function runPerformanceTest(arrURL, JWT) {
  const browser = await launch(puppeteerOptions);
  const page = await browser.newPage();

  // Configura la autenticación JWT en la página
  await page.setExtraHTTPHeaders({
    Authorization: `${JWT}`,
  });
  const result = [];

  for (let i = 0; i < arrURL.length; i++) {
    const { url, name } = arrURL[i];
    console.log(`- Testing ${i + 1} of ${arrURL.length} -`);
    console.log(`URL: ${url}`);
    console.log(`Name: ${name}`);
    await page.goto(url);

    const { report } = await lighthouse(page.url(), {
      ...lighthouseConfig,
      port: new URL(browser.wsEndpoint()).port,
    });

    const toJSON = JSON.parse(report);
    const scores = [];
    for (const current in toJSON?.categories) {
      const { title, score } = toJSON?.categories?.[current];
      scores.push({
        title,
        score,
      });
    }
    result.push({ URL: url, name, scores });
  }

  await browser.close();
  const workbook = new ExcelJS.Workbook();
  for (const current of result) {
    const worksheet = workbook.addWorksheet(current.name);
    worksheet.addRow(['Categoría', 'Puntuación']);
    for (const category of current.scores) {
      const score = category.score * 100;
      const title = category.title;
      worksheet.addRow([title, score]);
    }
  }

  const date = new Date();
  await workbook.xlsx.writeFile(`lighthouse-report-${date}.xlsx`);
  console.log('-------------- Done :)  ---------------');
}

runPerformanceTest(urlToTest, JWT);
