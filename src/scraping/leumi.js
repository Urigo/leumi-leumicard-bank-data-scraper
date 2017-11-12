import * as puppeteer from 'puppeteer';
import credentials from '../credentials';
import * as fs from 'fs';


const BASE_URL = 'https://hb2.bankleumi.co.il';

export async function scrapeFromBank() {

  // Remove headless comment in order to debug and watch the browser do it's work
  const browser = await puppeteer.launch(/*{headless: false}*/);
  const page = await browser.newPage();

  const cookies = await page.cookies();
  await Promise.all(cookies.map(async (cookie) => {
    await page.deleteCookie(cookie);
  }));

  await loginToLeumi(page);

  await goToNISCheckingPage(page);

  await loadAllNISCheckingPeriod(page);

  await getAllNISTransactions(page);


  await goBackToHomePage(page);


  await goToDollarsPage(page);

  await loadAllDollarsAccountPeriod(page);

  await getAllDollarsTransactions(page);


  await goBackToHomePage(page);


  await goToCreditCardPage(page);

  await loadAllCreditCardPeriod(page);

  await getAllCreditCardTransactions(page);

  await browser.close();
}

async function goBackToHomePage(page) {

  await page.click('placeholder-directive#logo');
  await page.waitForNavigation();
  await closeWalkMe(page);
}

async function loginToLeumi(page) {

  const LEUMI_URL = BASE_URL + '/H/Login.html';
  const USER_ID_INPUT = '#uid';
  const PASSWORD_INPUT = '#password';
  const PASSWORD_FAKE_INPUT = '#password_fake';

  const username = credentials.username;
  const password = credentials.password;

  await page.goto(LEUMI_URL);

  await page.type(USER_ID_INPUT, username);

  await page.type(PASSWORD_INPUT, password);

  await page.type(PASSWORD_FAKE_INPUT, password);

  await page.click('input[id="enter"]');

  await page.setViewport({width: 1024, height: 768});

  await page.waitForNavigation();

  console.log('before main page');
  try {
    await page.waitForSelector('div[leumi-content="NISChecking"]');
  } catch (error) {
    console.error(console.log('error main page', error));
  }
  console.log('after main page');

  console.log('before walkme');

  await closeWalkMe(page);

  console.log('after main walkme');
}

async function closeWalkMe(page) {
  try {
    const closeButton = await page.waitForSelector('div.walkme-click-and-hover', { timeout: 1000 });
    const isPopup = await page.waitForSelector('div#walkme-balloon-354322', { timeout: 1000 });
    console.log('closeButton', closeButton);
    page.click('.walkme-action-close');
    page.click('.walkme-action-cancel');
    page.click('div.walkme-click-and-hover');

    await closeWalkMe(page);
    // walkme-popup-background
  } catch (error) {
    console.error(console.log('error walk me destroy', error));
  }
}

async function goToNISCheckingPage(page) {

  console.log('clicking go to NIS checking');
  try {
    const result = await page.click('div[leumi-wt="NISChecking"] a');
    console.log('clicking go to NIS checking', result);
  } catch (error) {
    console.log('error 2', error);
  }

  console.log('loading....');

  try {
    console.log('waiting for checking page');
    await page.waitForSelector('#ctlActivityTable');
  } catch (error) {
    console.log('error 3', error);
  }

  console.log('done loading');
}

async function loadAllNISCheckingPeriod(page) {

  await page.waitFor(1000);
  console.log('Changing dates');
  await page.waitForSelector('#ddlTransactionPeriod');
  await page.select('#ddlTransactionPeriod', '004');

  try {
    page.evaluate(() => {
      // TODO: Change for calculated field 2 years from now (Leumi's stupid limit)
      document.querySelector('#dtFromDate_textBox').value = '15/11/15';
      document.querySelector('#dtToDate_textBox').value = '05/10/17';
    });
  } catch (error) {
    console.log('error loadAllNISCheckingPeriod', error);
  }

  await page.waitFor(1500);
  console.log('clickling');
  await page.waitForSelector('#btnDisplayDates');
  await page.click('#btnDisplayDates', {
    delay: 1000
  });
  console.log('loading....');

  await page.waitFor(10000);
  await page.waitForSelector('#WorkSpaceBox #ctlActivityTable');
}

async function getAllNISTransactions(page) {

  console.log('Going through transactions');

  const ids = await page.evaluate(async () => {
    const list = document.querySelectorAll('#WorkSpaceBox #ctlActivityTable tr td div.additionalPlus');
    const ids = [];
    for (const element of list) {
      const id = 'additionalPlus' + ids.length;
      ids.push(id);
      element.setAttribute('puppeteer', id)
    }
    return ids;
  });

  await page.waitFor(500);

  const getElements = [];
  await Promise.all(ids.map(async (id) => {
    const clickableButton = await page.$(`div[puppeteer=${id}]`);
    getElements.push(clickableButton);
  }));

  await page.waitFor(100);

  let processItems = async function(x){
    console.log('x', x);
    if( x < ids.length ) {
        // await page.waitFor(100);
      await getElements[x].click();
      await processItems(x+1);
    }
  };

  await processItems(0);

  await page.waitFor(1500);

  try {
    const transactionsTable = await page.evaluate(async () => {

      const tds = document.querySelectorAll('#WorkSpaceBox #ctlActivityTable tr td');

      let listOfDates = [];
      for (const element of tds) {
        if (element.classList.contains('ExtendedActivityColumnDate')) {
          let newTransaction = {};
          newTransaction.date = element.innerText;
          listOfDates.push(newTransaction);
        } else if (element.classList.contains('ActivityTableColumn1LTR')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.description = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('ReferenceNumberUniqeClass')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.reference = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('AmountDebitUniqeClass')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.amountSent = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('AmountCreditUniqeClass')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.amountReceived = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('number_column')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.balance = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('tdDepositRowAdded')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.transferOtherSideDetails = element.innerText;
          listOfDates.push(changedTransaction);
        }
      }

      return listOfDates;
    });

    console.log('transactionsTable', transactionsTable);
    let transactionsObject = {
      transactions: transactionsTable
    };
    let date = new Date();
    fs.writeFile(`LEUMI_NIS_checking_${date.toISOString()}.json`, JSON.stringify(transactionsObject), 'utf8', function(){
      console.log('done dumping NIS file');
    });
  } catch (error) {
    console.log('error getAllNISTransactions', error);
  }
}

async function goToDollarsPage(page) {

  await page.waitFor(1500);
  console.log('clicking go to FX checking');
  await page.waitForSelector('div[leumi-wt="FXChecking"]');
  try {
    const result = await page.click('div[leumi-wt="FXChecking"] a');
    console.log('clicking go to FX checking', result);
  } catch (error) {
    console.log('error 2', error);
  }

  console.log('loading....');

  try {
    console.log('waiting for checking page');
    await page.waitForSelector('#ctlForeignAccounts');
  } catch (error) {
    console.log('error 3', error);
  }

  console.log('done list of accounts');
  console.log('luciaishot');

  console.log('clicking go to a specific FX checking account');
  try {
    const result = await page.click('a[href="/ebanking/ForeignCurrency/DisplayForeignAccountsActivity.aspx?index=2"]');
    console.log('result of clicking go to a specific FX checking account', result);
  } catch (error) {
    console.log('error 2', error);
  }

  try {
    console.log('waiting for checking page');
    await page.waitForSelector('#ctlActivityTable');
  } catch (error) {
    console.log('error 3', error);
  }

  console.log('done loading');
}

async function loadAllDollarsAccountPeriod(page) {

  await page.waitFor(1000);
  console.log('Changing dates');
  await page.waitForSelector('#ddlTransactionPeriod');
  await page.select('#ddlTransactionPeriod', '3');

  try {
    page.evaluate(() => {
      // TODO: Change for calculated field 2 years from now (Leumi's stupid limit)
      document.querySelector('#dtFromDate_textBox').value = '15/10/15';
      document.querySelector('#dtToDate_textBox').value = '05/10/17';
    });
  } catch (error) {
    console.log('error loadAllNISCheckingPeriod', error);
  }

  await page.waitFor(1500);
  console.log('clickling');
  await page.waitForSelector('#btnDisplayDates');
  await page.click('#btnDisplayDates', {
    delay: 1000
  });
  console.log('loading....');

  await page.waitFor(10000);
  await page.waitForSelector('#WorkSpaceBox #ctlActivityTable');
}

async function getAllDollarsTransactions(page) {

  console.log('Going through transactions');

  await page.waitFor(1500);

  try {
    const transactionsTable = await page.evaluate(async () => {

      const tds = document.querySelectorAll('#WorkSpaceBox #ctlActivityTable tr td');

      let listOfDates = [];
      for (const element of tds) {
        console.log('element', element.classList);
        if (element.classList.contains('alignRightExcel')) {
          let newTransaction = {};
          newTransaction.date = element.innerText;
          listOfDates.push(newTransaction);
        } else if (element.classList.contains('ExtendedActivityColume5')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.description = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.length === 0) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.reference = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('dirLTRorRTLNum') && element.nextSibling.classList.contains('dirLTRorRTLNum')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.amountSent = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('dirLTRorRTLNum') && !element.nextSibling.classList.contains('dirLTRorRTLNum')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.amountReceived = element.innerText;
          listOfDates.push(changedTransaction);
        } else if (element.classList.contains('DirectionLTR')) {
          let changedTransaction = listOfDates.pop();
          changedTransaction.balance = element.innerText;
          listOfDates.push(changedTransaction);
        }
      }

      return listOfDates;
    });

    console.log('transactionsTable', transactionsTable);
    let transactionsObject = {
      transactions: transactionsTable
    };
    let date = new Date();
    fs.writeFile(`LEUMI_dollars_account_${date.toISOString()}.json`, JSON.stringify(transactionsObject), 'utf8', function(){
      console.log('done dumping NIS file');
    });
  } catch (error) {
    console.log('error getAllNISTransactions', error);
  }
}

async function goToCreditCardPage(page) {

  await page.waitFor(1500);
  console.log('clicking go to credit card');
  await page.waitForSelector('div[leumi-wt="creditCard"]');
  try {
    const result = await page.click('div[leumi-wt="creditCard"] a');
    console.log('clicking go to credit card checking', result);
  } catch (error) {
    console.log('error 2', error);
  }

  console.log('loading....');

  try {
    console.log('waiting for credit card first page');
    await page.waitForSelector('#ctlActivityTable');
  } catch (error) {
    console.log('error 3', error);
  }

  console.log('clicking go to a specific credit card');
  try {
    const result = await page.click('a[href="/ebanking/CreditCard/DisplayCreditCardActivity.aspx?MyeBank=true&PmmMode=false&index=5"]');
    console.log('result of clicking go to a specific credit card', result);
  } catch (error) {
    console.log('error 2', error);
  }

  try {
    console.log('waiting for specific credit card page');
    await page.waitForSelector('#lkleumiCard');
  } catch (error) {
    console.log('error 3', error);
  }

  console.log('done loading');

  const leumiCardLink = await page.evaluate(() => {
    return document.querySelector('a[id="lkleumiCard"]').getAttribute('href');
  });

  const startIndex = leumiCardLink.indexOf('/');
  const endIndex = leumiCardLink.indexOf('isResize') + 'isResize=no'.length;
  const fullLink = BASE_URL + leumiCardLink.slice(startIndex, endIndex);

  console.log('fullLink', fullLink);

  await page.goto(fullLink);
}

async function loadAllCreditCardPeriod(page) {

  console.log('Changing dates');
  await page.waitForSelector('#PlaceHolderMain_CD_CardsFilter1_ctl02_ddlActionType');
  await page.select('#PlaceHolderMain_CD_CardsFilter1_ctl02_ddlActionType', '3');

  try {
    page.evaluate(() => {
      // TODO: Change for calculated field 1 years from now (Leumi card's stupid limit)
      document.querySelector('#txtFromDate').value = '15/08/16';
    });
  } catch (error) {
    console.log('error loadAllCreditCardPeriod', error);
  }

  console.log('clickling');
  await page.waitForSelector('#PlaceHolderMain_CD_CardsFilter1_btnShow');
  await page.click('#PlaceHolderMain_CD_CardsFilter1_btnShow');
  console.log('loading....');

  await page.waitForNavigation();

  await page.waitForSelector('#PlaceHolderMain_CD_rptMain_pnlTables_0 > table.NotPaddingTable');
  console.log('done loading');
}

async function getAllCreditCardTransactions(page) {

  console.log('Going through transactions');

  await page.waitForSelector('#PlaceHolderMain_CD_rptMain_pnlTables_0 > table.NotPaddingTable');
  await page.waitFor(1500);

  let allTransactions = [];

  const transactionTypesArray = ['עסקאות בש', 'עסקאות לידיעה בש', 'עסקאות במט', 'עסקאות לידיעה במט'];
  for (const transactionType of transactionTypesArray) {

    let isLastPageExists = true;
    while (isLastPageExists) {

      try {
        const currentPageTransactionsTable = await page.evaluate(async (transactionType) => {

          const tds = document.querySelectorAll('#PlaceHolderMain_CD_rptMain_pnlTables_0 > table.NotPaddingTable tr td');

          function handleCCtableRow(element, listOfDates) {
            if (element.previousSibling &&
              element.previousSibling.classList &&
              element.previousSibling.classList.contains('jobsTD_right') &&
              !element.parentElement.classList.contains('creditDifduf')) {

              let newTransaction = {};
              newTransaction.dealDate = element.innerText;
              listOfDates.push(newTransaction);
            } else if (element.classList &&
              element.classList.contains('tdRight') &&
              element.previousSibling &&
              element.previousSibling.previousSibling &&
              element.previousSibling.previousSibling.classList &&
              element.previousSibling.previousSibling.classList.contains('jobsTD_right')) {

              let changedTransaction = listOfDates.pop();
              changedTransaction.chargeDate = element.innerText;
              listOfDates.push(changedTransaction);
            } else if (element.classList &&
              element.classList.contains('tdRight') &&
              element.previousSibling &&
              element.previousSibling.previousSibling &&
              element.previousSibling.previousSibling.previousSibling &&
              element.previousSibling.previousSibling.previousSibling.classList &&
              element.previousSibling.previousSibling.previousSibling.classList.contains('jobsTD_right')) {

              let changedTransaction = listOfDates.pop();
              changedTransaction.businessName = element.innerText;
              listOfDates.push(changedTransaction);

            } else if (element.classList &&
              element.classList.contains('tdRight') &&
              element.nextSibling &&
              element.nextSibling.nextSibling &&
              element.nextSibling.nextSibling.nextSibling &&
              element.nextSibling.nextSibling.nextSibling.classList &&
              element.nextSibling.nextSibling.nextSibling.classList.contains('comments')) {

              let changedTransaction = listOfDates.pop();
              changedTransaction.transactionType = element.innerText;
              listOfDates.push(changedTransaction);

            } else if (element.classList &&
              element.classList.contains('tdLtr') &&
              element.nextSibling &&
              element.nextSibling.nextSibling &&
              element.nextSibling.nextSibling.classList &&
              element.nextSibling.nextSibling.classList.contains('comments')) {

              let changedTransaction = listOfDates.pop();
              changedTransaction.dealAmount = element.innerText;
              listOfDates.push(changedTransaction);

            } else if (element.classList &&
              element.classList.contains('tdLtr') &&
              element.nextSibling &&
              element.nextSibling.classList &&
              element.nextSibling.classList.contains('comments')) {

              let changedTransaction = listOfDates.pop();
              changedTransaction.chargeAmount = element.innerText;
              listOfDates.push(changedTransaction);

            } else if (element.classList &&
              element.classList.contains('comments')) {

              let changedTransaction = listOfDates.pop();
              changedTransaction.comments = element.firstChild.innerText;
              listOfDates.push(changedTransaction);

            } else if (element.classList &&
                       element.classList.contains('openedJob_td')) {

              const detailTypes = {
                businessLongName: 'שם:',
                address: 'כתובת:',
                phone: 'טלפון:',
                businessCategory: 'ענף:',
                dealType: 'סוג עסקה:',
                actionType: 'אופן ביצוע:',
                currency: 'מטבע:',
                originalAmount: 'סכום מקור:',
                transactionTime: 'שעת העסקה:'
              };
              const listOfExtraDetails = element.querySelectorAll('li');
              for (const liDetailElement of listOfExtraDetails) {

                if (liDetailElement.querySelector('label').innerText.includes(detailTypes.businessLongName)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.businessLongName = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.businessLongName) + detailTypes.businessLongName.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.address)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.businessAddress = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.address) + detailTypes.address.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.phone)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.phone = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.phone) + detailTypes.phone.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.businessCategory)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.businessCategory = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.businessCategory) + detailTypes.businessCategory.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.dealType)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.dealType = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.dealType) + detailTypes.dealType.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.actionType)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.actionType = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.actionType) + detailTypes.actionType.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.currency)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.currency = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.currency) + detailTypes.currency.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.originalAmount)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.originalAmount = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.originalAmount) + detailTypes.originalAmount.length + 1);
                  listOfDates.push(changedTransaction);

                } else if (liDetailElement.querySelector('label').innerText.includes(detailTypes.transactionTime)) {

                  let changedTransaction = listOfDates.pop();
                  changedTransaction.transactionTime = liDetailElement.innerText.slice(
                    liDetailElement.innerText.indexOf(detailTypes.transactionTime) + detailTypes.transactionTime.length + 1);
                  listOfDates.push(changedTransaction);

                }
              }
            }
          }

          let listOfDates = [];

          for (const element of tds) {

            const tableType = element.parentElement.parentElement.parentElement.previousSibling.previousSibling.previousSibling.previousSibling.innerText;

            if (tableType.includes(transactionType)) {
              handleCCtableRow(element, listOfDates);
            }
          }

          return listOfDates;
        }, transactionType);
        allTransactions.push(...currentPageTransactionsTable);
      } catch (error) {
        console.log('error getting current page transactions', error);
      }

      try {
        let isNextPageButtonExists = await page.evaluate(async (transactionType) => {

          let listOfLastPages = document.querySelectorAll('li[class="difdufLeft"]');
          let isLastPageExistsInner = false;

          for (const lastPage of listOfLastPages) {

            let isLastPageFromCurrentTable = lastPage.parentElement.parentElement.parentElement.parentElement.parentElement.previousSibling.previousSibling.previousSibling.previousSibling.innerText.includes(transactionType);
            if (isLastPageFromCurrentTable) {
              isLastPageExistsInner = true;
              lastPage.setAttribute('puppeteer', `puppeteer-next-page-for-${transactionType}`);
            }
          }

          return isLastPageExistsInner;
        }, transactionType);

        if (isNextPageButtonExists) {

          console.log('isNextPageButtonExists', isNextPageButtonExists);
          const nextPageButton = await page.$(`li[puppeteer="puppeteer-next-page-for-${transactionType}"]`);
          await nextPageButton.click();
          await page.waitForNavigation();
          await page.waitForSelector('tr[class="creditDifduf"]');
        } else {
          isLastPageExists = false;
        }
      } catch (error) {
        console.log('error navigating to next page', error);
      }
    }
  }

  console.log('transactionsTable', allTransactions);
  let transactionsObject = {
    transactions: allTransactions
  };
  let date = new Date();
  fs.writeFile(`LEUMI_credit_card_${date.toISOString()}.json`, JSON.stringify(transactionsObject), 'utf8', function(){
    console.log('done dumping NIS file');
  });
}

