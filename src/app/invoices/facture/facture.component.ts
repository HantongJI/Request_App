import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Web3Service } from '../../util/web3.service';

const Web3 = require('web3');

@Component({
  selector: 'app-request',
  templateUrl: './facture.component.html',
  styleUrls: ['./facture.component.scss'],
})
export class Facture implements OnInit, OnDestroy {
  objectKeys = Object.keys;
  account: string;
  mode: string;
  request: any;
  progress: number;
  url = window.location.href;
  txHash: string;
  subscription: any;
  searchValue: string;
  timerInterval: any;
  loading = false;
  trans = this.url.substring(this.url.indexOf("0x")).trim();
  date: string;
  fact: string;
  transac: any;
  value: string;
  public fromWei;
  private web3;
  private infuraNodeUrl = {
    1: 'https://mainnet.infura.io/BQBjfSi5EKSCQQpXebO',
    4: 'https://rinkeby.infura.io/BQBjfSi5EKSCQQpXebO'
  };

  constructor(public web3Service: Web3Service, private route: ActivatedRoute) {}

  async ngOnInit() {
    // wait for web3 to be instantiated
    if (!this.web3Service || !this.web3Service.web3Ready) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.ngOnInit();
    }
    this.watchAccount();

    this.subscription = this.web3Service.searchValue.subscribe(async searchValue => {
      if (searchValue && searchValue.length > 42) {
        this.searchValue = searchValue;
        const request = await this.web3Service.getRequestByRequestId(searchValue);
        await this.setRequest(request);
        this.loading = false;
      }
    });

    if (this.route.snapshot.params['requestId']) {
      this.web3Service.setSearchValue(this.route.snapshot.params['requestId']);
    } else if (this.route.snapshot.params['txHash']) {
      this.txHash = this.route.snapshot.params['txHash'];
      this.watchRequestByTxHash();
    }

    // watch Request in background
    this.timerInterval = setInterval(async _ => {
      if (!this.searchValue) { return; }
      const request = await this.web3Service.getRequestByRequestId(this.searchValue);
      this.setRequest(request);
    }, 7500);
  }

  async watchTxHash(txHash) {
    const result = await this.web3Service.getRequestByTransactionHash(txHash);
    if (result.request && result.request.requestId) {
      await this.setRequest(result.request);
      this.loading = false;
    } else {
      await new Promise(resolve => setTimeout(resolve, 5000));
      this.watchTxHash(txHash);
    }
  }

  async watchRequestByTxHash() {
    if (this.searchValue) { return console.log('stopped watching txHash'); }
    const result = await this.web3Service.getRequestByTransactionHash(this.txHash);
    if (result.request && result.request.requestId) {
      return this.web3Service.setSearchValue(result.request.requestId);
    } else if (result.message === 'Contract is not supported by request') {
      return await this.setRequest({ errorTxHash: 'Sorry, we are unable to locate any request matching this transaction hash' });
    } else if (result.transaction) {
      const request = {
        waitingMsg: 'Transaction found. Waiting for it to be mined...',
        payee: {
          address: result.transaction.method.parameters._payeesIdAddress[0],
          balance: this.web3Service.BN(this.web3Service.toWei('0')),
          expectedAmount: this.web3Service.BN(result.transaction.method.parameters._expectedAmounts[0]),
        },
        payer: result.transaction.method.parameters._payer,
        data: { data: null },
      };
      if (result.transaction.method.parameters._data) {
        request.data.data = await this.web3Service.getIpfsData(result.transaction.method.parameters._data);

      }
      await this.setRequest(request);
    } else if (this.route.snapshot.queryParams.request) {
      if (!this.request ||  !this.request.waitingMsg) {
        const queryParamRequest = JSON.parse(this.route.snapshot.queryParams.request);
        if (queryParamRequest.payee && queryParamRequest.payee.address && queryParamRequest.payee.balance && queryParamRequest.payee.expectedAmount && queryParamRequest.payer) {
          const request = {
            payer: queryParamRequest.payer,
            payee: {
              address: queryParamRequest.payee.address,
              balance: this.web3Service.BN(this.web3Service.toWei('0')),
              expectedAmount: this.web3Service.BN(this.web3Service.toWei(queryParamRequest.payee.expectedAmount))
            },
            data: queryParamRequest.data
          };
          await this.setRequest(request);
        }
      }
    } else {
      return await this.setRequest({ errorTxHash: 'Sorry, we are unable to locate this transaction hash' });
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
    return this.watchRequestByTxHash();
  }


  async setRequest(request) {
    // if new search
    if (request.requestId && (((!this.request || !this.request.requestId) && this.route.snapshot.params['txHash']) || this.request && this.request.requestId && this.request.requestId !== request.requestId)) {
      this.request = null;
    }
    if (request.state !== undefined) {
      this.web3Service.setRequestStatus(request);
    }
    if (request.requestId && !request.events) {
      request.events = await this.web3Service.getRequestEvents(request.requestId);
    }
    this.request = request;
    this.getRequestMode();
  }

  watchAccount() {
    this.web3Service.accountObservable.subscribe(account => {
      this.account = account;
      this.getRequestMode();
    });
  }

  getRequestMode() {
    if (!this.request || !this.request.payee) { return; }
    this.mode = this.account === this.request.payee.address ? 'payee' : this.account === this.request.payer ? 'payer' : 'none';
    this.getTrans();
  }

  refresh() {
    location.reload();
  }

  async getTrans() {
    this.web3 = new Web3(new Web3.providers.HttpProvider(this.infuraNodeUrl[4]));//'https://rinkeby.infura.io/BQBjfSi5EKSCQQpXebO'
    const transInfo = await (this.web3.eth.getTransaction(this.trans));
    const blockInfo = await (this.web3.eth.getBlock(transInfo.blockNumber));
    const val = this.web3Service.fromWei(transInfo.value);
    document.getElementById('quantity').innerHTML = val.toString();
    const pri = (this.request.data.data.price.substring(2))/this.web3Service.fromWei(this.request.payee.expectedAmount);
    const time = new Date(blockInfo.timestamp*1000);
    document.getElementById('total').innerHTML = (val*pri).toString();
    var y = time.getFullYear();
    var m = time.getMonth() + 1;
    var d = time.getDate();
    var mois;
    switch (m) {
      case 1 :mois = "janvier";break;
      case 2 :mois = "février";break;
      case 3 :mois = "mars";break;
      case 4 :mois = "avril";break;
      case 5 :mois = "mai";break;
      case 6 :mois = "juin";break;
      case 7 :mois = "juillet";break;
      case 8 :mois = "août";break;
      case 9 :mois = "septembre";break;
      case 10:mois = "octobre";break;
      case 11:mois = "novembre";break;
      case 12:mois = "décembre";break;
      default:
    }
    this.date = d + " " + mois + " " + y;
    this.web3Service.setSearchTrans(this.trans);
    this.fact = "Facture no. : " + y + "-" + ("0" + m).slice(-2) + "-" + this.trans.substring(2,7);
  }

  printPage() {
    var prtContent = document.getElementById("facture");
    var WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    WinPrint.document.write(prtContent.innerHTML);
    WinPrint.document.close();
    WinPrint.focus();
    //WinPrint.print();
    //WinPrint.close();
  }

  ngOnDestroy() {
    if (this.subscription) { this.subscription.unsubscribe(); }
    if (this.timerInterval) { clearInterval(this.timerInterval); }
  }

}
