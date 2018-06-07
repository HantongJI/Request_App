import { Injectable, HostListener } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { MatSnackBar } from '@angular/material';

import RequestNetwork from '@requestnetwork/request-network.js';
import ProviderEngine from 'web3-provider-engine';
import RpcSubprovider from 'web3-provider-engine/subproviders/rpc';
import LedgerWalletSubprovider from 'ledger-wallet-provider';

const Web3 = require('web3');

/* beautify preserve:start */
declare let window: any;
/* beautify preserve:end */

@Injectable()
export class Web3Service {
  private web3;
  private requestNetwork: RequestNetwork;
  private infuraNodeUrl = {
    1: 'https://mainnet.infura.io/BQBjfSi5EKSCQQpXebO',
    4: 'https://rinkeby.infura.io/BQBjfSi5EKSCQQpXebO'
  };

  public metamask = false;
  public ledgerConnected = false;
  public web3Ready: boolean;

  public etherscanUrl: string;

  public accountObservable = new BehaviorSubject < string > (null);
  public networkIdObservable = new BehaviorSubject < number > (null);
  public searchValue = new Subject < string > ();
  public searchTrans = new Subject < string > ();

  private web3NotReadyMsg = 'Error when trying to instanciate web3.';
  private requestNetworkNotReadyMsg = 'Request Network smart contracts are not deployed on this network. Please use Mainnet or Rinkeby Testnet.';
  private walletNotReadyMsg = 'Connect your Metamask or Ledger wallet to create or interact with a Request.';

  public fromWei;
  public toWei;
  public BN;
  public isAddress;

  constructor(private snackBar: MatSnackBar) {
    window.addEventListener('load', async event => {
      console.log('web3service instantiate web3');
      this.checkAndInstantiateWeb3();
      this.networkIdObservable.subscribe(networkId => this.setEtherscanUrl());
      setInterval(async _ => await this.refreshAccounts(), 1000);
    });
  }


  public checkLedger(networkId, derivationPath) {
    return new Promise(async(resolve, reject) => {
      const ledgerWalletSubProvider = await LedgerWalletSubprovider(() => networkId, derivationPath);
      const ledger = ledgerWalletSubProvider.ledger;

      if (!ledger.isU2FSupported) {
        reject('Ledger Wallet uses U2F which is not supported by your browser.');
      }

      ledger.getMultipleAccounts(derivationPath, 0, 10).then(
          async res => {
            const engine = new ProviderEngine();
            engine.addProvider(ledgerWalletSubProvider);
            engine.addProvider(new RpcSubprovider({ rpcUrl: this.infuraNodeUrl[networkId] }));
            engine.start();
            const web3 = new Web3(engine);
            const addresses = Object.entries(res).map(e => ({ derivationPath: e[0], address: e[1], balance: 0 }));
            for (const address of addresses) {
              address.balance = this.fromWei(await web3.eth.getBalance(address.address.toString()));
            }
            resolve(addresses);
          })
        .catch(err => {
          if (err.metaData && err.metaData.code === 5) {
            reject('Timeout error. Please verify your ledger is connected and the Ethereum application opened.');
          } else if (err === 'Invalid status 6801') {
            reject('Invalid status 6801. Check to make sure the right application is selected on your ledger.');
          }
        });
    });
  }


  public async instanciateWeb3FromLedger(networkId, derivationPath) {
    const ledgerWalletSubProvider = await LedgerWalletSubprovider(() => networkId, derivationPath);
    const engine = new ProviderEngine();
    engine.addProvider(ledgerWalletSubProvider);
    engine.addProvider(new RpcSubprovider({ rpcUrl: this.infuraNodeUrl[networkId] }));
    engine.start();

    this.checkAndInstantiateWeb3(new Web3(engine));
    this.openSnackBar('Ledger Wallet successfully connected.', null, 'success-snackbar');
    this.ledgerConnected = true;
  }


  public async checkAndInstantiateWeb3(web3 ? ) {
    if (web3 || typeof window.web3 !== 'undefined') {
      console.log(`Using web3 detected from external source. If you find that your accounts don\'t appear, ensure you\'ve configured that source properly.`);

      if (web3) {
        // if Ledger wallet
        this.web3 = web3;
        this.refreshAccounts(true);
      } else {
        // if Web3 has been injected by the browser (Mist/MetaMask)
        this.metamask = window.web3.currentProvider.isMetaMask;
        this.ledgerConnected = false;
        this.web3 = new Web3(window.web3.currentProvider);
      }
      const networkId = await this.web3.eth.net.getId();
      this.networkIdObservable.next(networkId);
    } else {
      console.warn(`No web3 detected. Falling back to ${this.infuraNodeUrl[1]}.`);
      this.networkIdObservable.next(1); // mainnet by default
      this.web3 = new Web3(new Web3.providers.HttpProvider(this.infuraNodeUrl[1]));
    }

    // instanciate requestnetwork.js
    try {
      this.requestNetwork = new RequestNetwork(this.web3.currentProvider, this.networkIdObservable.value);
    } catch (err) {
      this.openSnackBar(this.requestNetworkNotReadyMsg);
      console.error(err);
    }

    this.fromWei = this.web3.utils.fromWei;
    this.toWei = this.web3.utils.toWei;
    this.isAddress = this.web3.utils.isAddress;
    this.BN = mixed => new this.web3.utils.BN(mixed);
  }


  /* beautify preserve:start */
  private async refreshAccounts(force ?: boolean) {
  /* beautify preserve:end */
    if (this.ledgerConnected && !force) { return; }

    const accs = await this.web3.eth.getAccounts();
    if (!accs || accs.length === 0) {
      this.accountObservable.next(null);
    } else if (this.accountObservable.value !== accs[0]) {
      this.accountObservable.next(accs[0]);
    }

    if (this.web3Ready === undefined) { this.web3Ready = true; }

  }


  private setEtherscanUrl() {
    switch (this.networkIdObservable.value) {
      case 1:
        this.etherscanUrl = 'https://etherscan.io/';
        break;
      case 3:
        this.etherscanUrl = 'https://ropsten.etherscan.io/';
        break;
      case 4:
        this.etherscanUrl = 'https://rinkeby.etherscan.io/';
        break;
      case 42:
        this.etherscanUrl = 'https://kovan.etherscan.io/';
        break;
      default:
        break;
    }
  }


  private watchDog() {
    const stop = !this.web3 || !this.requestNetwork || !this.accountObservable.value;
    if (stop) { this.openSnackBar(); }
    return stop;
  }


  /* beautify preserve:start */
  public openSnackBar(msg ?: string, ok ?: string, panelClass ?: string, duration ?: number) {
  /* beautify preserve:end */
    if (!msg) {
      msg = !this.web3 ? this.web3NotReadyMsg : !this.requestNetwork ? this.requestNetworkNotReadyMsg : !this.accountObservable.value ? this.walletNotReadyMsg : '';
      if (msg === '') { return; }
    }
    this.snackBar.open(msg, ok || 'Ok', {
      duration: duration || 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: panelClass || 'warning-snackbar',
    });
  }


  public setSearchValue(searchValue: string) {
    this.searchValue.next(searchValue);
  }

  public setSearchTrans(searchTrans: string) {
    this.searchTrans.next(searchTrans);
  }

  public setRequestStatus(request) {
    if (request.state === 2) {
      request.status = 'cancelled';
    } else if (request.state === 1) {
      if (request.payee.balance.isZero()) {
        request.status = 'accepted';
      } else if (request.payee.balance.lt(request.payee.expectedAmount)) {
        request.status = 'in progress';
      } else if (request.payee.balance.eq(request.payee.expectedAmount)) {
        request.status = 'complete';
      } else if (request.payee.balance.gt(request.payee.expectedAmount)) {
        request.status = 'overpaid';
      }
    } else {
      request.status = 'created';
    }
  }


  private confirmTxOnLedgerMsg() {
    if (this.ledgerConnected) {
      setTimeout(_ => { this.openSnackBar('Please confirm transaction on your ledger.', null, 'info-snackbar'); }, 1500);
    }
  }


  public createRequestAsPayer(payee: string, expectedAmount: string, data: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    if (!this.web3.utils.isAddress(payee)) { return callback({ message: 'payee\'s address is not a valid Ethereum address' }); }
    const expectedAmountInWei = this.toWei(expectedAmount);
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.createRequestAsPayer([payee], [expectedAmountInWei], this.accountObservable.value, null, null, data);
  }


  public cancel(requestId: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.cancel(requestId);
  }


  public accept(requestId: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.accept(requestId);
  }


  public subtractAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString());
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.subtractAction(requestId, [amountInWei]);
  }


  public additionalAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString());
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.additionalAction(requestId, [amountInWei]);
  }


  public paymentAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString());
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.paymentAction(requestId, [amountInWei], []);
  }


  public refundAction(requestId: string, amount: string, callback ? ) {
    if (this.watchDog()) { return callback(); }
    const amountInWei = this.toWei(amount.toString());
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.refundAction(requestId, amountInWei);
  }


  public async getRequestByRequestId(requestId: string) {
    try {
      const request = await this.requestNetwork.requestCoreService.getRequest(requestId);
      this.setRequestStatus(request);
      return request;
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }

/*
  public async getCoreContractByRequestId(requestId: string) {
    try {
      const contract = await this.requestNetwork.requestCoreService.getCoreContractFromRequestId(requestId);
      //this.setRequestStatus(request);
      return contract;
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }
*/

  //@return  promise of the object containing the request and the transaction
  public async getRequestByTransactionHash(txHash: string) {
    try {
      const response = await this.requestNetwork.requestCoreService.getRequestByTransactionHash(txHash);
      return response;
    } catch (err) {
      // console.log('Error: ', err.message);
      return err;
    }
  }


  public async getRequestEvents(requestId: string) {
    try {
      const events = await this.requestNetwork.requestCoreService.getRequestEvents(requestId);
      return events.sort((a, b) => b._meta.timestamp - a._meta.timestamp);
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }


  public async getRequestsByAddress(address: string) {
    try {
      const requests = await this.requestNetwork.requestCoreService.getRequestsByAddress(address);
      return requests;
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }


  public broadcastSignedRequestAsPayer(signedRequest: string, amountsToPay: any[], callback ? ) {
    if (this.watchDog()) { return callback(); }
    this.confirmTxOnLedgerMsg();
    return this.requestNetwork.requestEthereumService.broadcastSignedRequestAsPayer(signedRequest, amountsToPay);
  }


  public async getIpfsData(hash: string) {
    try {
      const result = await this.requestNetwork.requestCoreService.getIpfsFile(hash);
      return JSON.parse(result);
    } catch (err) {
      console.log('Error: ', err.message);
      return err;
    }
  }


  public isSignedRequestHasError(signedRequest: any, payer: string) {
    return this.requestNetwork.requestEthereumService.isSignedRequestHasError(signedRequest, payer);
  }


}
