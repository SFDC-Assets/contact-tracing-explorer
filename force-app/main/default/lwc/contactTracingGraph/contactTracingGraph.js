import {
    LightningElement,
    api,
    track
} from 'lwc';
import {
    loadScript
} from 'lightning/platformResourceLoader';
import {
    ShowToastEvent
} from 'lightning/platformShowToastEvent';
import {
    NavigationMixin
} from 'lightning/navigation';
import getGraphByAccountId from '@salesforce/apex/ContactTracingGraphCtrl.getGraphByAccountId';
import getGraphByEncounterId from '@salesforce/apex/ContactTracingGraphCtrl.getGraphByEncounterId';
import getGraphByContactId from '@salesforce/apex/ContactTracingGraphCtrl.getGraphByContactId';
import getGraphByLeadId from '@salesforce/apex/ContactTracingGraphCtrl.getGraphByLeadId';
import getContactDetailsById from '@salesforce/apex/ContactTracingGraphCtrl.getContactDetailsById';
import usericon from '@salesforce/resourceUrl/ctgraphusericon';
import encountericon from '@salesforce/resourceUrl/ctgraphencountericon';
import D3 from '@salesforce/resourceUrl/d3minjs11212020';

const types = ["Root", "Contact", "Encounter", "Lead", "Lookup"];


export default class ContactTracingGraph extends NavigationMixin(LightningElement) {

    d3initialized = false;
    simulation;
    svg;
    legend;
    data;
    node;
    link;
    color;
    popupRecordId;
    @api recordId;
    @api title;
    @api width;
    @api height;
    @api showLegend;
    @api legendWidth; //delete me
    @api legendHeight; //delete me
    @track showPopup = false;
    @track popupStyle;
    @track popupTitle;
    @track hasTitle;
    @track isPerson;
    @track personStatus;
    @track zoom = 4;
    @track undoDisabled = true;
    xshift = 0;
    yshift = 0;
    zoomScalingFactors = [4, 2, 1.5, 1, 0.75, 0.50, 0.25];
    nodeStack = [];
    linkStack = [];


    connectedCallback() {
        this.hasTitle = (this.title != null) || (this.title === "");
        if ((this.width === null) || (this.width === undefined))
            this.width = 1200;
        if ((this.height === null) || (this.height === undefined))
            this.height = 500;
        //for testing
        this.showLegend = true;

    }

    renderedCallback() {
        if (this.d3initialized) {
            return
        }
        this.d3initialized = true;
        Promise.all([
                loadScript(this, D3)
            ])
            .then(() => {
                this.getContactTraceData();
            })
            .catch(error => {
                console.error(error);
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error loading D3",
                        message: error.body.message,
                        variant: "error"
                    })
                )
            })
    }

    getContactTraceData() {
        getGraphByAccountId({
                accountId: this.recordId,
                isRoot: true
            })
            .then(result => {
                this.data = result;
                this.initializeD3()
            })
            .catch(error => {
                console.error(error)
            })
    }

    closePopup() {
        this.showPopup = false;
    }

    pan() {
        let width = this.width;
        let height = this.height;
        let x = this.xshift;
        let y = this.yshift;
        let scalingFactor = this.zoomScalingFactors[this.zoom - 1];
        let newWidth = Math.round(parseInt(this.width) * scalingFactor);
        let newHeight = Math.round(parseInt(this.height) * scalingFactor);
        this.svg.attr("viewBox", [-newWidth / 2 + x, -newHeight / 2 + y, newWidth, newHeight])
        this.legend.selectAll("circle")
            .attr("cx", -newWidth / 2 + 10 + x)
            .attr("cy", function (d, i) {
                return -newHeight / 2 + 10 + i * 25 + y
            });
        this.legend.selectAll("text")
            .attr("x", -newWidth / 2 + 30 + x)
            .attr("y", function (d, i) {
                return -newHeight / 2 + 10 + i * 25 + y
            });
    }

    panleft() {
        this.xshift += 100;
        this.pan();
    }

    panright() {
        this.xshift -= 100;
        this.pan();
    }

    panup() {
        this.yshift += 100;
        this.pan();
    }

    pandown() {
        this.yshift -= 100
        this.pan();
    }

    center() {
        this.xshift = 0;
        this.yshift = 0;
        this.pan();
    }


    updateZoom(event) {
        console.log(event.target.value);
        this.zoom = event.target.value;
        this.pan();
    }

    navigateToRecordViewPage(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId,
                actionName: 'view'
            }
        });
    }

    undo() {
        this.data.links = this.linkStack.pop();
        this.data.nodes = this.nodeStack.pop();
        this.undoDisabled = this.nodeStack.length == 0;
        console.log("pop " + this.nodeStack.length);
        this.update();
    }

    navigateToPopupRecord() {
        this.closePopup();
        this.navigateToRecordViewPage(this.popupRecordId);
    }


    drag(simulation) {
        const
            dragstarted = (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            },
            dragged = (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            },
            dragended = (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    nodeMouseOver(d) {
        let node = d.target.__data__;
        console.log("mouse over node " + d.target.__data__.id);
        nodes.find(n => n.id === link.source).expanded
    }

    nodeMouseOut(d) {}

    nodeClicked(d) {
        let node = d.target.__data__;
        if (node.type === 'Contact') {
            getGraphByContactId({
                    contactId: node.id
                })
                .then(result => this.dedupAndUpdateGraph(result))
                .catch(error => console.error(error))
        }
        if (node.type === 'Encounter') {
            getGraphByEncounterId({
                    encounterId: node.id
                })
                .then(result => this.dedupAndUpdateGraph(result))
                .catch(error => console.error(error))
        }
        if (node.type === 'Lead') {
            getGraphByLeadId({
                    leadId: node.id
                })
                .then(result => this.dedupAndUpdateGraph(result))
                .catch(error => console.error(error))
        }
    }

    openPopup(d) {
        this.popupRecordId = d.target.__data__.id;
        if ((d.target.__data__.type === 'Contact') ||
            (d.target.__data__.type === 'Lead') ||
            (d.target.__data__.type === 'Root')) {
            this.popupTitle = d.target.__data__.name;
            this.isPerson = true;
            getContactDetailsById({
                    contactId: this.popupRecordId
                })
                .then(result => {
                    console.log("contact query", result);
                    this.personStatus = result.Account.HealthCloudGA__StatusGroup__pc;
                })
        }
        if (d.target.__data__.type === 'Encounter') {
            this.popupTitle = d.target.__data__.name;
            this.isPerson = false;
        }
        let x = d.layerX;
        let y = d.layerY;
        let xstyle = "left : " + Math.round(x) + "px;"
        let ystyle = "top : " + Math.round(y) + "px;"
        this.popupStyle = xstyle + ystyle;
        this.showPopup = true;
        d.preventDefault();
        return false;
    }

    update() {
        let simulation = this.simulation;
        const color = d3.scaleOrdinal(types, d3.schemeCategory10);

        // Make a shallow copy to protect against mutation, while
        // recycling old nodes to preserve position and velocity.
        const old = new Map(this.node.data().map(d => [d.id, d]));
        let nodes = this.data.nodes.map(d => Object.assign(old.get(d.id) || {}, d));
        let links = this.data.links.map(d => Object.assign({}, d));

        this.node = this.node
            .data(nodes, d => d.id)
            .join(enter => {
                var ret = enter.append("g")
                    .call(this.drag(simulation))
                    .on('mouseover', this.nodeMouseOver.bind(this))
                    .on('mouseout', this.nodeMouseOut.bind(this))
                    .on('dblclick', this.nodeClicked.bind(this))
                    .on('contextmenu', this.openPopup.bind(this))
                ret.append("circle")
                    .attr("stroke", "white")
                    .attr("stroke-width", 1.5)
                    .attr("fill", d => color(d.type))
                    .attr("r", 16);
                ret.append("image")
                    .attr("xlink:href", d => this.iconselector(d.type))
                    .attr("x", "-12px")
                    .attr("y", "-12px")
                    .attr("width", "24px")
                    .attr("height", "24px");
                ret.append("text")
                    .attr("x", 20)
                    .attr("y", "0.31em")
                    .text(d => d.name)
                    .clone(true).lower()
                    .attr("fill", "none")
                    .attr("stroke", "white")
                    .attr("stroke-width", 3)
                return ret;
            });
        this.link = this.link
            .data(links, d => [d.source, d.target])
            .join("path")
            .attr("stroke", d => color(d.type))
            .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);;

        simulation.nodes(nodes);
        simulation.force("link").links(links);
        simulation.on("tick", this.ticked.bind(this));
        simulation.alpha(1).restart();

    }

    ticked() {
        this.link.attr("d", this.linkArc);
        this.node.attr("transform", d => `translate(${d.x},${d.y})`);
    }

    iconselector(type) {
        if (type == "Encounter") return encountericon;
        return usericon;
    }

    linkArc(d) {
        //const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
        return `
      M${d.source.x},${d.source.y}
      L${d.target.x},${d.target.y}
    `;
    }

    dedupAndUpdateGraph(result) {
        const
            mergedLinks = this.data.links.concat(result.links),
            linkKeys = ['source', 'target'],
            uniqueLinks = mergedLinks.filter(
                (s => o =>
                    (k => !s.has(k) && s.add(k))
                    (linkKeys.map(k => o[k]).join('|'))
                )
                (new Set)
            ),
            mergedNodes = this.data.nodes.concat(result.nodes),
            nodeKeys = ['id'],
            uniqueNodes = mergedNodes.filter(
                (s => o =>
                    (k => !s.has(k) && s.add(k))
                    (nodeKeys.map(k => o[k]).join('|'))
                )
                (new Set)
            );
        if ((this.data.links.length == uniqueLinks.length) && (this.data.nodes.length == uniqueNodes.length)) {
            //well, do nothing since nothing has changed
            console.log("this node has nothing to add to the graph");
        } else {
            this.nodeStack.push(this.data.nodes);
            this.linkStack.push(this.data.links);
            console.log("push " + this.nodeStack.length);
            this.undoDisabled = false;
            this.data.links = [...uniqueLinks];
            this.data.nodes = [...uniqueNodes];
            this.update()
        }
    }

    initializeD3() {
        var
            links = this.data.links.map(d => Object.create(d)),
            nodes = this.data.nodes.map(d => Object.create(d))
        const
            height = this.height,
            width = this.width,
            color = d3.scaleOrdinal(types, d3.schemeCategory10);

        this.svg = d3.select(this.template.querySelector(".d3"))
            .append('svg')
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .style("font", "12px sans-serif")

        this.legend = this.svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5);

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(90))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("x", d3.forceX())
            .force("y", d3.forceY())

        //Create the legend
        this.legend.selectAll("mydots")
            .data(types)
            .enter()
            .append("circle")
            .attr("cx", -width / 2 + 10)
            .attr("cy", function (d, i) {
                return -height / 2 + 10 + i * 25
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .attr("r", 7)
            .style("fill", function (d) {
                return color(d)
            })

        // Add one dot in the legend for each name.
        this.legend.selectAll("mylabels")
            .data(types)
            .enter()
            .append("text")
            .attr("x", -width / 2 + 30)
            .attr("y", function (d, i) {
                return -height / 2 + 10 + i * 25
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", function (d) {
                return color(d)
            })
            .text(function (d) {
                return d
            })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")

        //Initialize the svg drawing
        this.svg.append("defs").selectAll("marker")
            .data(types)
            .join("marker")
            .attr("id", d => `arrow-${d}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -0.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", color)
            .attr("d", "M0,-5L10,0L0,5");

        this.link = this.svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke", d => color(d.type));

        this.node = this.svg.append("g")
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(this.drag(this.simulation))
            .on('mouseover', this.nodeMouseOver.bind(this))
            .on('mouseout', this.nodeMouseOut.bind(this))
            .on('dblclick', this.nodeClicked.bind(this))
            .on('contextmenu', this.openPopup.bind(this));

        this.node.append("circle")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("fill", d => color(d.type))
            .attr("r", 16);

        this.node.append("image")
            .attr("xlink:href", d => this.iconselector(d.type))
            .attr("x", "-12px")
            .attr("y", "-12px")
            .attr("width", "24px")
            .attr("height", "24px");

        this.node.append("text")
            .attr("x", 20)
            .attr("y", "0.31em")
            .text(d => d.name)
            .clone(true).lower()
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 3);

        this.simulation.on("tick", this.ticked.bind(this));
    }


}