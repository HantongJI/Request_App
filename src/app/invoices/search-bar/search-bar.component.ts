import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Web3Service } from '../../util/web3.service';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent implements OnInit {

  searchForm:      FormGroup;
  searchTransForm: FormGroup;
  searchValueFormControl: FormControl;
  searchTransFormControl: FormControl;

  constructor(private web3Service: Web3Service, private formBuilder: FormBuilder, public router: Router, private route: ActivatedRoute) {}


  ngOnInit() {
    this.searchValueFormControl = new FormControl('');
    this.searchTransFormControl = new FormControl('');

    this.searchForm = this.formBuilder.group({
      searchValueFormControl: this.searchValueFormControl
    });

    this.searchTransForm = this.formBuilder.group({
      searchTransFormControl: this.searchTransFormControl
    });

    this.web3Service.searchValue.subscribe(searchValue => {
      //this.searchTransFormControl.setValue(null);
      this.searchValueFormControl.setValue(searchValue);
    });

    this.web3Service.searchTrans.subscribe(searchTrans => {
      //this.searchValueFormControl.setValue(null);
      this.searchTransFormControl.setValue(searchTrans);
    });
  }

  search(searchValue) {
    this.searchTransFormControl.setValue(null);
    searchValue = searchValue.split(' ').join('');
    if (this.router.routerState.snapshot.url.startsWith('/request')) {
      //this.web3Service.setSearchTrans(null);
      if (searchValue.length <= 42) {
        this.router.navigate(['/search', searchValue]);
      } else {
        this.web3Service.setSearchValue(searchValue);
      }
    } else if (this.router.routerState.snapshot.url.startsWith('/search')) {
      if (searchValue.length > 42) {
        this.router.navigate(['/request/requestId', searchValue]);
      } else {
        this.web3Service.setSearchValue(searchValue);
      }
    } else {
      if (searchValue.length <= 42) {
        this.router.navigate(['/search', searchValue]);
      } else if (searchValue.length > 42) {
        this.router.navigate(['/request/requestId', searchValue]);
      }
    }
  }

  searchTrans(transHash) {
    transHash = transHash.split(' ').join('');
    if (this.router.routerState.snapshot.url.startsWith('/facture')) {
      this.web3Service.setSearchTrans(transHash);
      }
    else {
      this.router.navigate(['/facture', transHash]);
    }
  }

}
