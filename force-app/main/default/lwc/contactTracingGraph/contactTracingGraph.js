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
    svg;
    legend;
    data;
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
    xshift = 0;
    yshift = 0;
    zoomScalingFactors = [4,2,1.5,1,0.75,0.50,0.25];


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
        let scalingFactor = this.zoomScalingFactors[this.zoom-1];
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

    navigateToPopupRecord() {
        this.closePopup();
        this.navigateToRecordViewPage(this.popupRecordId);
    }

    initializeD3() {
        var
            links = this.data.links.map(d => Object.create(d)),
            nodes = this.data.nodes.map(d => Object.create(d)),
            link, node;
        const
            height = this.height,
            width = this.width,
            simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(90))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("x", d3.forceX())
            .force("y", d3.forceY()),

            color = d3.scaleOrdinal(types, d3.schemeCategory10),
            ticked = () => {
                link.attr("d", linkArc);
                node.attr("transform", d => `translate(${d.x},${d.y})`);
            },

            iconselector = type => {
                if (type == "Encounter") return encountericon;
                return usericon;
            },

            update = () => {
                // Make a shallow copy to protect against mutation, while
                // recycling old nodes to preserve position and velocity.
                const old = new Map(node.data().map(d => [d.id, d]));
                nodes = this.data.nodes.map(d => Object.assign(old.get(d.id) || {}, d));
                links = this.data.links.map(d => Object.assign({}, d));

                node = node
                    .data(nodes, d => d.id)
                    .join(enter => {
                        var ret = enter.append("g")
                            .call(drag(simulation))
                            .on('mouseover', nodeMouseOver)
                            .on('mouseout', nodeMouseOut)
                            .on('dblclick', nodeClicked)
                            .on('contextmenu', openPopup)
                        ret.append("circle")
                            .attr("stroke", "white")
                            .attr("stroke-width", 1.5)
                            .attr("fill", d => color(d.type))
                            .attr("r", 16);
                        ret.append("image")
                            .attr("xlink:href", d => iconselector(d.type))
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
                link = link
                    .data(links, d => [d.source, d.target])
                    .join("path")
                    .attr("stroke", d => color(d.type))
                    .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);;

                simulation.nodes(nodes);
                simulation.force("link").links(links);
                simulation.on("tick", ticked);
                simulation.alpha(1).restart();

            },

            linkArc = d => {
                const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
                return `
              M${d.source.x},${d.source.y}
              L${d.target.x},${d.target.y}
            `;
                /* use this if you like curvy lines
                return `
                  M${d.source.x},${d.source.y}
                  A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
                `;*/
            },

            drag = simulation => {
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
            },


            nodeMouseOver = d => {
                console.log("mouse over node", d);
                //node.style('fill', "#B8B8B8")
                //d.target.setAttribute("style", "fill:#FF0000");
                //d3.select(this).style('fill', '#69b3b2')
                // Highlight the connections
                // link
                //    .style('stroke', function (link_d) {
                //        return link_d.source === d.target.__data__ || link_d.target === d.target.__data__ ? '#000000' : color(link_d.type);
                //    })
                /*.style('stroke-width', function (link_d) {
                    return link_d.source === d.target.__data__ || link_d.target === d.target.__data__ ? 2 : 1.5;
                })*/
            },
            nodeMouseOut = d => {
                //d.target.setAttribute("style", "fill:#000000");
                //link.style('stroke', dlink => color(dlink.type))
                //.style('stroke-width', '1.5')
            },

            dedupAndUpdateGraph = result => {
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
                this.data.links = [...uniqueLinks];
                this.data.nodes = [...uniqueNodes];
                update()
            },

            nodeClicked = d => {
                if (d.target.__data__.type === 'Contact') {
                    getGraphByContactId({
                            contactId: d.target.__data__.id
                        })
                        .then(result => dedupAndUpdateGraph(result))
                        .catch(error => console.error(error))
                }
                if (d.target.__data__.type === 'Encounter') {
                    getGraphByEncounterId({
                            encounterId: d.target.__data__.id
                        })
                        .then(result => dedupAndUpdateGraph(result))
                        .catch(error => console.error(error))
                }
                if (d.target.__data__.type === 'Lead') {
                    getGraphByLeadId({
                            leadId: d.target.__data__.id
                        })
                        .then(result => dedupAndUpdateGraph(result))
                        .catch(error => console.error(error))
                }
            },

            openPopup = d => {
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
                let x = d.offsetX
                let y = d.offsetY;
                let xstyle = "left : " + Math.round(x) + "px;"
                let ystyle = "top : " + Math.round(y) + "px;"
                this.popupStyle = xstyle + ystyle;
                this.showPopup = true;
                d.preventDefault();
                return false;
            },

            svg = d3.select(this.template.querySelector(".d3"))
            .append('svg')
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .style("font", "12px sans-serif"),

            legend = svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5);

        this.svg = svg;
        this.legend = legend;

        //Create the legend
        legend.selectAll("mydots")
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
        legend.selectAll("mylabels")
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
        svg.append("defs").selectAll("marker")
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

        link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke", d => color(d.type))
            .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);

        node = svg.append("g")
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(drag(simulation))
            .on('mouseover', nodeMouseOver)
            .on('mouseout', nodeMouseOut)
            .on('dblclick', nodeClicked)
            .on('contextmenu', openPopup);

        node.append("circle")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("fill", d => color(d.type))
            .attr("r", 16);

        node.append("image")
            .attr("xlink:href", d => iconselector(d.type))
            .attr("x", "-12px")
            .attr("y", "-12px")
            .attr("width", "24px")
            .attr("height", "24px");

        node.append("text")
            .attr("x", 20)
            .attr("y", "0.31em")
            .text(d => d.name)
            .clone(true).lower()
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 3);

        simulation.on("tick", ticked);
    }


}