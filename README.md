<img src="https://request.network/assets/img/request-logo.png" width="50px" >

---
# Request_App

A basic angular dapp using web3.js and RequestNetwork.js for interacting with Request Network Smart-Contract.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.6.6.

## Install Dependencies

You need at least node v8.9.0 and npm 5.5.1 to run this project. Run `npm i` to install all the dependencies listed in package.json

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `npm run build:prod` to generate the build repository in /dist.


## CreatedByPayer

This is a version which the request is created by the payer, adjustions have been made in these parts:

home: web3Service.createRequestAsPayer is used instead of web3Service.createRequestAsPayee, and related modification has been made, for example, the ETH address; a major part is that the reason is change to the total price of the ETH transferred in terms of EURO, the price itself is unfixed, normally we only keeps 2 decimal place. Although the exchange rate is required for the invoice, the rate at the moment the request is generated is normally not the same as the one at the moment the invoice is generated, so the exchange rate should be passed by the request. It makes more sense to have the total price instead of the exchange rate kept in the request, this leads to the unfixed price, as it is used to calculate the exchange rate in the invoice and the rate is better to be more accurate. Since the whole function is based on the original one, it is limited and a better solution is to be found. The exchange rate is obtained from coinmarketcap in the async function getRate, however, a major problem (the problem will be introduced in the following paragraph) has been encounter when using the API Version 2 of coinmarketcap and a solution hasn't been found yet, this function is using API Version 1, which will be taken offline on November 30th, 2018. The url is currently showing an unnecessary part "/#/" for reasons unknown, although it doesn't appear to influence the function.

The API V1 (https://api.coinmarketcap.com/v1/ticker/ethereum/?convert=EUR) comes in the form below:

```
[
  {
    ...
    "price_eur": "517.695046611",
    ...
  }
]
```

The V2 (https://api.coinmarketcap.com/v2/ticker/1027/?convert=EUR) comes in the form:

```
{
    "data": {
        ...
        "quotes": {
            ...
            "EUR": {
                "price": 518.071500803,
                ...
            }
        },
        ...
    },
    ...
}
```

Notice the Missing of the square brackets in V2, a modification of the usage of the API is required yet not made.

request: with the modification of the the home page, the request is no longer from the payee but the payer, so related modification is made, and in order to be more specific, "FROM" is changed to "FROM(PAYER)", "TO" is changed to "TO(PAYEE)". Plus, the title "Reason" is changed to "Total Price in EUR" so as to be specific. As the request is made by the payer, so "ACTIONS" are different from the original version, yet still employed from the original modules. A recommended function is to show all the transactions of the payment and be used for the printing of the invoice, which will be introduced after.

search: "FROM" is changed to "FROM(PAYER)", "TO" is changed to "TO(PAYEE)", so as to be specific.

search-bar: another input of txHash can now be taken in order to satisfy the need of printing an invoice. This allows the user to search for a transaction with its hash, since the length of a txHash is the same as that of a requestId, it is impossible to mix these two functions but to seperate them.

## facture (invoice)

This is an added page which offers an invoice of each transaction gone through the request Network, at the moment it only meets the need of iExec, as information of the entreprise is fixed, future modification might be possible to make it satisfy any company, provided with a database or something of the information of that company.

The base of the script of the facture comes from that of the request, as it has the basic functions needed by the invoice. The added function getTrans gets all the information from the transaction and organizes them into the required form for the invoice. The function printPage is for printing the invoice, it separate the invoice from the whole page and one can save the HTML file of the invoice and print it.
