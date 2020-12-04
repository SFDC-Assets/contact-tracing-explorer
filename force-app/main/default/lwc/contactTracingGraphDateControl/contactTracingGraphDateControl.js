import {
    LightningElement,
    track,
    api
} from 'lwc';

export default class ContactTracingGraphDateControl extends LightningElement {

    @api collapse;
    @track beforeDateTime;
    @track afterDateTime;

    renderedCallback() {
        this.setCollapseClasses();
    }

    setCollapseClasses() {
        if (this.collapse)
            this.template.querySelector(".filter").classList.add("slds-hide")
        else
            this.template.querySelector(".filter").classList.remove("slds-hide")
    }

    toggleCollapse() {
        this.collapse = !this.collapse;
        this.setCollapseClasses();
    }

    updateBeforeDateTime(event) {
        this.beforeDateTime = event.target.value;
    }

    updateAfterDateTime(event) {
        this.afterDateTime = event.target.value;
    }

    apply() {
        this.dispatchEvent(new CustomEvent("datechange", {
            detail: {
                beforeDateTime: this.beforeDateTime,
                afterDateTime: this.afterDateTime,
            }
        }))
    }

    clear() {
        this.beforeDateTime = null;
        this.afterDateTime = null;
    }


}