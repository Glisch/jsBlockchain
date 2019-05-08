const SHA256 = require("crypto-js/sha256");

class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.hash = this.calculateHash();
        this.nonce = 0;
    }

    calculateHash() {
        return SHA256(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString();
    }

    mineBlock(difficulty) {
        while(this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log("Block Mined: " +this.hash);
    }
    
}

class Transaction{
    constructor(fromAddress, toAddress, amount){
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
    }

    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.amount).toString();
    }

    signTransaction(signingKey) {
        if(signingKey.getPublic('hex') !== this.fromAddress){
            throw new Error('You cannot sign transactions for other wallets');
        }

        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    isValid() {
        if(this.fromAddress === null) return true;

        if(!this.signature || this.signature.length === 0){
            throw new Error('No signature in this transaction');
        }

        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Blockchain{

    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2;

        //Place to store transactions in between block creation
        this.pendingTransactions = [];

        //How many coins a miner will get as reard for work
        this.miningReward = 100;
    }

    createGenesisBlock() {
        return new Block(0, "2019/04/28", "Genesis Block", "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(transaction) {
        if(!transaction.fromAddress || !transaction.toAddress){
            throw new Error('Transaction must include from and to address');
        }

        if(!transaction.isValid()) {
            throw new Error('Cannot add invalid transaction');
        }

        this.pendingTransactions.push(transaction);
    }

    minePendingTransactions(miningRewardAddress) {
        //Create new block with all pending transactions and mine it...
        let block = new Block(Date.now(), this.pendingTransactions);
        block.mineBlock(this.difficulty);

        //Add newly mined block to chain
        this.chain.push(block);

        //Reset the pending txns and send mining reward
        this.pendingTransactions = [
            new Transaction(null, miningRewardAddress, this.miningReward)
        ];
    }

    isChainValid() {
        for(let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i-1];

            if(currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            } else if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }

            if(!currentBlock.hasValidTransactions()) {
                return false;
            }
        }

        return true;
    }

    getBalanceOfAddress(address){
        let balance = 0; // you start at zero!
    
        // Loop over each block and each transaction inside the block
        for(const block of this.chain){
            for(const trans of block.transactions){
    
                // If the given address is the sender -> reduce the balance
                if(trans.fromAddress === address){
                    balance -= trans.amount;
                }
    
                // If the given address is the receiver -> increase the balance
                if(trans.toAddress === address){
                    balance += trans.amount;
                }
            }
        }
    
        return balance;
    }

    hasValidTransactions() {
        for(const tx of this.transactions) {
            if(!tx.isValid()) {
                return false;
            }
        }
        return true;
    }

}

// Import elliptic
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

// Create key object
const myKey = ec.keyFromPrivate('4415dd09b9852a9ecdd075e9f2ba168ab2361d02ce66c7e029782571f6da5f9a');
const myWalletAddress = myKey.getPublic('hex');

let gcoin = new Blockchain();

console.log('Creating some transactions...');
let txn1 = new Transaction(myWalletAddress, 'recipient_1', 10);
txn1.signTransaction(myKey);
gcoin.addTransaction(txn1);
let txn2 = new Transaction(myWalletAddress, 'recipient_2', 90);
txn2.signTransaction(myKey);
gcoin.addTransaction(txn2);

console.log('Starting the miner...');
gcoin.minePendingTransactions(myWalletAddress);

//console.log(gcoin.getLatestBlock().transactions);

console.log('Balance of address is', gcoin.getBalanceOfAddress(myWalletAddress));

console.log('Starting the miner...');
gcoin.minePendingTransactions(myWalletAddress);

console.log('Balance of address is', gcoin.getBalanceOfAddress(myWalletAddress));