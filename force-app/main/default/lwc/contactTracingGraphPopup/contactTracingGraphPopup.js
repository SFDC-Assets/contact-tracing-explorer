/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: CC-0
 * For full license text, see the LICENSE file in the repo root
 */
import {
    LightningElement,
    api,
    track
} from 'lwc';
import getContactDetailsById from '@salesforce/apex/ContactTracingGraphCtrl.getContactDetailsById';
import getLeadDetailsById from '@salesforce/apex/ContactTracingGraphCtrl.getLeadDetailsById';
import getEncounterDetailsById from '@salesforce/apex/ContactTracingGraphCtrl.getEncounterDetailsById';

const
    TYPE_PERSON = 1,
    TYPE_ENCOUNTER = 2;

export default class ContactTracingGraphPopup extends LightningElement {
    @api
    get recordid() {
        return this._recordId;
    };
    set recordid(value) {
        this._recordId = value;
        //what kind of record is it? a contact, lead, or encounter?
        let identifier = value ? value.substring(0, 3) : "because it's undefined";
        switch (identifier) {
            case '003': //contact 
                this.getContactDetails();
                break;
            case '00Q': //lead
                this.getLeadDetails();
                break;
            case '0ha': //ContactEncounter
                this.getEncounterDetails();
                break;
            default:
                console.log("Not sure what this recordId is for " + value);
        }
    }

    @track _recordId;
    @track person = {};
    @track encounter = {};
    @track title;

    setDisplay(type) {
        switch (type) {
            case TYPE_PERSON:
                this.template.querySelector(".person").classList.remove('slds-hide');
                this.template.querySelector(".encounter").classList.add('slds-hide');
                break;
            case TYPE_ENCOUNTER:
                this.template.querySelector(".person").classList.add('slds-hide');
                this.template.querySelector(".encounter").classList.remove('slds-hide');
                break;
            default:
                console.log("not sure what to show, so show nothing");
                this.template.querySelector(".person").classList.add('slds-hide');
                this.template.querySelector(".encounter").classList.add('slds-hide');
        }
    }

    close() {
        this.person = {};
        this.encounter = {};
        this.dispatchEvent(new CustomEvent('close'));
    }

    ready() {
        this.dispatchEvent(new CustomEvent('ready'));
    }

    convertToSentenceCase(value) {
        var result = value.replace(/([A-Z])/g, " $1");
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    getContactDetails() {
        getContactDetailsById({
                contactId: this._recordId
            })
            .then(result => {
                console.log("contact query", result);
                this.person = {
                    type: "Employee",
                    status: this.convertToSentenceCase(result.Account.HealthCloudGA__StatusGroup__pc),
                    email: result.Email,
                    phone: result.Phone
                }
                this.title = result.Name;
                this.setDisplay(TYPE_PERSON);
                this.ready();
            })
    }

    getLeadDetails() {
        getLeadDetailsById({
                leadId: this._recordId
            })
            .then(result => {
                console.log("lead query", result);
                this.person = {
                    type: "External",
                    status: this.convertToSentenceCase(result.HealthCloudGA__StatusGroup__c),
                    email: result.Email,
                    phone: result.Phone
                }
                this.title = result.Name;
                this.setDisplay(TYPE_PERSON);
                this.ready();
            })

    }

    getEncounterDetails() {
        getEncounterDetailsById({
                encounterId: this._recordId
            })
            .then(result => {
                console.log("encounter query", result);
                let startTime = result.StartTime ? new Date(result.StartTime).toLocaleString() : "Not Specified"
                this.encounter = {
                    duration: result.EncounterDuration ? result.EncounterDuration + " Minutes" : "Not Specified",
                    partipantCount: result.EstimatedParticipantCount,
                    startTime,
                    location: result.LocationId ? result.Location.Name : "Not Specified",
                    locationId: result.LocationId
                }
                this.title = result.Name;
                this.setDisplay(TYPE_ENCOUNTER);
                this.ready();
            })
    }
}