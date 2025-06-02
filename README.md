# Ledn Backend Challenge

## Introduction

In the vast and volatile galaxy, **Beskar** (also known as Mandalorian steel) stands as a rare and invaluable alloy, impervious to lightsabers and blasters alike. Its scarcity makes it a highly coveted asset. At **Coruscant Bank**, we offer a unique financial service: Beskar-Backed Loans, providing liquidity to individuals holding this precious metal.

Our operations span the galaxy, with primary Beskar markets located in the bustling trade hubs of **Mos Espa** and **Black Spire Outpost**. From these critical locations, we meticulously source real-time Beskar pricing information. Following the tumultuous fall of the Empire, all loans are now disbursed in the universally accepted **Galactic Credit Standard**.

Due to the inherent market volatility of Beskar, Coruscant Bank employs a stringent lending policy to mitigate risk: we only accept loan applications collateralized at a **2:1 ratio**. This means clients must post twice the value of Beskar (in Galactic Credits) for every Galactic Credit they wish to receive as a disbursement. In essence, new loans become active when their **Loan-to-Value (LTV) ratio is 50%**.

This challenge tasks you with building a critical component of Coruscant Bank's financial infrastructure: the **Liquidation Service**.

## The Challenge: Implement Coruscant Bank's Liquidation Service

Your mission is to implement a robust and reliable backend service that handles the lifecycle of Beskar-backed loans, from application to potential liquidation. This service must seamlessly integrate with existing external services, demonstrating your ability to build interconnected systems.

### Requirements

Your implementation of Coruscant Bank's liquidation service must fulfill the following functionalities:

1. **Consume Price Streams**: Continuously ingest real-time Beskar trading prices from two distinct markets:
    * **Mos Espa**: Provides prices in JSON format.
    * **Black Spire Outpost**: Provides prices in XML format.

2. **Loan Management API**: Expose endpoints for bank representatives to:
    * **Register New Loan Applications**: Allow the creation of new loan requests.
    * **Increase Collateral Balance**: Enable clients to post additional Beskar collateral for an existing loan.
    * **Get List of Loans**: Provide a comprehensive list of all registered loans and their current status.
    * **Withdraw Remaining Collateral**: Facilitate the withdrawal of any leftover collateral after a loan has been liquidated.

3. **Loan Activation**: Automatically mark loans as **active** once 100% of their required Beskar collateral has been successfully posted.

4. **Automated Liquidation**: Identify and liquidate active loans that reach or exceed the **liquidation threshold of 80% LTV**. When a loan is liquidated, your service must sell just enough collateral to cover the disbursed loan amount.

5. **Branch Notifications**: Upon successful liquidation of a loan, simultaneously notify all Coruscant Bank branches.

6. **Borrower Warnings**: Automatically issue a warning to the borrower when a loan's LTV reaches the **warning threshold of 70%**.

### External Integration Notes

Requests to sell Beskar must be made using HTTP requests to either Mos Espa or Black Spire Outpost. Be prepared for real-world scenarios: these external trading services are designed to **randomly fail approximately 30% of the time**.

### Constraints

Your solution must adhere to the following critical constraints:

* **Auditing**: A complete history of all operations (loan applications, collateral postings, liquidations, warnings) must be meticulously kept for auditing purposes.
* **Single Liquidation**: A loan **must not be liquidated more than once**.
* **Post-Liquidation Collateral**: It **must not be possible to post collateral for a loan that has already been liquidated**.
* **Liquidation Persistence**: Once the liquidation process begins, it **must continue** even if the loan's LTV temporarily drops below the liquidation threshold during the process.
* **Market Specifics**:
  * **Mos Espa**: Accepts JSON payloads for sell orders and provides prices in JSON.
  * **Black Spire Outpost**: Accepts XML payloads for sell orders and provides prices in XML.
* **Warning Frequency**: After sending a borrower a high LTV warning, a new warning **must not be sent again** unless the loan's LTV subsequently drops below 60% and then rises back to 70% or higher.

## Evaluation Criteria

Your solution will be evaluated on the following aspects:

* **Correctness and Completeness**: How accurately and thoroughly does your service meet all specified requirements and constraints?
* **System Integration**: Demonstrate robust and resilient integration with the provided external services, including handling their simulated failures gracefully.
* **Error Handling and Resiliency**: How well does your service handle unexpected scenarios, such as network failures, invalid inputs, and external service outages?
* **Code Quality**: Readability, maintainability, modularity, and adherence to best practices.
* **Scalability and Performance Considerations**: While not a full-scale production system, consider how your design choices would impact scalability and performance.
* **Testing**: Evidence of comprehensive unit, integration, and end-to-end testing to ensure the reliability of your service.
* **Documentation**: Clear and concise documentation explaining your architecture, design choices, and how to run and test your solution.

## Existing Services

As part of this challenge, you will be provided with source code and a Docker Compose file to spin up several existing services. Your solution **must integrate with these services** but **must not modify or use their internal source code directly**.

### Coruscant Bank OTC Service

This service simulates client activity and interactions with the bank.

* **Client Activity**: Simulates various actors (e.g., borrowers).
* **Loan Liquidation Events**: Subscribed to events published on the SNS topic `coruscant-bank-loan-liquidation-events`.
  * **Schema for Liquidation Event Messages (Body)**:
    * `eventId`: A `string` identifying the unique event.
    * `eventType`: `liquidation`
    * `loanId`: A `string` representing the unique loan.
    * `collateralSold`: A `string` representing units of collateral that were sold.
    * `collateralSoldValue`: A `string` representing the value of collateral sold in Galactic Credits.
    * `outstandingCollateral`: A `string` representing units of collateral that ought to be returned to the client.
    * `outstandingBalance`: A `string` representing any outstanding balance in Galactic Credits.
* **New Loan Applications**: Places new loan application requests onto the SQS queue `coruscant-bank-beskar-loan-applications`.
  * **Schema for Loan Application Messages (Body)**:
    * `requestId`: A `string` identifying the unique request to apply for a loan.
    * `loanId`: A `string` identifying the unique loan.
    * `amount`: A `string` representing the amount the client requests to be disbursed in Galactic Credits.
    * `borrowerId`: A `string` representing the client.
* **Collateral Top-ups**: Places requests to increase collateral balances onto the SQS queue `coruscant-bank-beskar-top-ups`.
  * **Schema for Collateral Top-up Messages (Body)**:
    * `requestId`: A `string` identifying the unique request to add collateral.
    * `loanId`: A `string` identifying the unique loan.
    * `borrowerId`: A `string` identifying the client that owns the loan.
    * `amount`: A `string` representing the units of Beskar.

### Trading Service (Mos Espa, Tatooine)

This service manages an order book and simulates trading activity for Beskar on Tatooine.

* **Order Book & Trading Simulation**: Manages an order book and simulates market actors.
* **Price Events**: Publishes price events to the SNS topic `tatooine-mos-espa-prices`.
  * **Schema**:
    * `priceId`: A `string` identifying the unique price event.
    * `asset`: `BESKAR`
    * `currency`: `GC`
    * `timestamp`: `string` representing the date since Battle of Yavin in RFC 3339 format.
    * `levels`: An `array` of price levels.
      * `quantity`: `1`, `10`, `50`, or `100` units of Beskar.
      * `buy`: A `string` with the effective price of buying a given `quantity` of the asset.
      * `sell`: A `string` with the effective price of selling a given `quantity` of the asset.
* **Trade Orders**: Accepts trade orders via HTTP POST.
  * **`POST /orders`**
    * **Request Body Schema (JSON)**:
      * `type`: `market`
      * `side`: `buy` or `sell`
      * `asset`: `BESKAR`
      * `currency`: `GC`
      * `quantity`: A `string` with the units of asset to trade.
      * `clientOrderId`: A `string` clients can use for correlation.
    * **Successful Response Schema (JSON)**:
      * `orderId`: A `string` identifying the order in the order book.
      * `success`: `true`
      * `type`: `market`
      * `side`: `buy` or `sell`
      * `asset`: `BESKAR`
      * `currency`: `GC`
      * `quantity`: A `string` with the total units of asset traded.
      * `price`: A `string` with the total Galactic Credits traded.
      * `clientOrderId`
    * **Unsuccessful Response Schema (JSON)**:
      * `clientOrderId` (if available)
      * `success`: `false`
      * `reason`: A `string` explaining the reason for failure.

### Trading Service (Black Spire Outpost, Batuu)

This service also manages an order book and simulates trading activity, but specifically for Black Spire Outpost on Batuu.

* **Order Book & Trading Simulation**: Manages an order book and simulates market actors.
* **Price Events**: Publishes prices to the SNS topic `batuu-black-spire-outpost-price-stream`.
  * **Schema**:
    * `item`: `STEEL:MANDALORIAN` (equivalent to Beskar) or other.
    * `time`: `number` of seconds since the Battle of Yavin (same as UNIX Timestamp).
    * `buy`: An `array` of buy price levels.
      * `amount`: `1`, `10`, `50`, or `100` units.
      * `price`: A `number` with the effective price of buying a given `amount` of the asset.
    * `sell`: An `array` of sell price levels.
      * `amount`: `1`, `10`, `50`, or `100` units.
      * `price`: A `number` with the effective price of selling a given `amount` of the asset.
* **Trade Orders**: Accepts trade orders via HTTP POST.
  * **`POST /market/orders`**
    * **Request Body Schema (XML)**:
      * `<request>`
        * `<side>`: `BUY` or `SELL`
        * `<item>`: `STEEL:MANDALORIAN`
        * `<amount>`: A `number` representing units of `item` to trade.
        * `<customOrderId>`: A `string` clients can use for correlation.
    * **Successful Response Schema (XML)**:
      * `<response>`
        * `<id>`: A `string` identifying the unique order.
        * `<side>`: `BUY` or `SELL`
        * `<item>`: `STEEL:MANDALORIAN`
        * `<amount>`: A `number` representing units of `item` traded.
        * `<totalPrice>`: A `number` with the total Galactic Credits traded.
        * `<customOrderId>`
    * **Unsuccessful Response Schema (XML)**:
      * `<response>`
        * `<customOrderId>` (if available)
        * `<error>`: A `string` explaining the reason for the failure.

---
