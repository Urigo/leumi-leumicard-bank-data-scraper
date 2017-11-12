# [Bank Leumi](https://www.leumi.co.il/) and [Leumi-Card credit card](https://www.leumi-card.co.il/) data fetcher

This repository uses puppeteer to help you get your own data from Leumi's websites.

This is a completely open source project so that anyone could have access to their financial data even though Leumi doesn't provide an open API for it.

Feel free to add more banks and institutions here or improve this one.

## Background

Theses days there are a lot of talks about open data in banking.

The EU has passed [very significant and amazing laws](https://medium.freecodecamp.org/sick-of-your-banks-lame-app-open-banking-promises-more-9770cad2448c) and regulations about it.

But progress doesn't come everywhere as fast as it should.

In many countries politicians are too slow, too non technological, too corrupt or too influenced to make those changes.
Israel is one of them.

I believe that open source software is the best way to break through regulations when they are against the majority.

So here is a completely open source way to get your data from you bank.    


## How to use?

1. run `npm install`
2. insert your credentials to `src/credentials.ts` file
3. run `npm start` and it will run the scraper and put all of the data into `json` files inside the root of the project.

## Hebrew
קוד פתוח לייצוא על המידע מהאתר של בנק לאומי ומהאתר של לאומי קארד.

אשמח לתרומות לשיפור הקוד, פידבק על איך זה עובד וגם תרומות עבור בנקים נוספים.

עם הפתרון הזה תוכלו לשמור את מידע יותר משנה וחצי שזו ההגבלה של לאומי ולאומיד קארד.
אחרי התקופה הזו לא תוכלו לקבל יותר את המידע מהבנק. למה?  כי שאילתת מסד הנתונים שלהם תיקח כמה מילישניות יותר?

תוכל גם לפתח ממשק ו API פיננסי משלכם! 
בהחלט צריך קצת יותר תחרות וחידושים עבור בנקים ישראלים...

תהנו
