import { scrapeFromBank as scrapeLeumi } from './scraping/leumi';

async function getData() {
  await scrapeLeumi();
}
getData();
