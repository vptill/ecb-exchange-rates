const currencyConverter = require("../currencyConverter.js");

function runTests() {
  // Test getAllCurrencies
  console.log("\nTesting getAllCurrencies:");
  currencyConverter
    .getAllCurrencies()
    .then((currencies) => {
      console.log("Got currencies:", currencies.length);

      // Test getBaseCurrency
      console.log("\nTesting getBaseCurrency:");
      return currencyConverter.getBaseCurrency();
    })
    .then((base) => {
      console.log("Base currency:", base);

      // Test currency conversion
      console.log("\nTesting convert:");
      const convertSettings = {
        fromCurrency: "GBP",
        toCurrency: "USD",
        amount: 90,
        accuracy: 5,
      };
      return currencyConverter.convert(convertSettings);
    })
    .then((converted) => {
      console.log("Converted amount:", converted);

      // Test exchange rate
      console.log("\nTesting getExchangeRate:");
      const rateSettings = {
        fromCurrency: "GBP",
        toCurrency: "USD",
        accuracy: 5,
      };
      return currencyConverter.getExchangeRate(rateSettings);
    })
    .then((rate) => {
      console.log("Exchange rate:", rate);

      // Test currencies metadata
      console.log("\nTesting getCurrenciesMetadata:");
      return currencyConverter.getCurrenciesMetadata();
    })
    .then((metadata) => {
      console.log("Got metadata for currencies:", metadata.length);

      // Test single currency metadata
      console.log("\nTesting getCurrencyMetadata:");
      return currencyConverter.getCurrencyMetadata({
        currency: "EUR",
      });
    })
    .then((eurMetadata) => {
      console.log("EUR metadata:", eurMetadata);
    })
    .catch((err) => {
      console.error("Test failed:", err);
    });
}

runTests();
