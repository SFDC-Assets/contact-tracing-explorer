import {
    LightningElement,
    api
} from 'lwc';
import {
    loadScript
} from 'lightning/platformResourceLoader';
import {
    ShowToastEvent
} from 'lightning/platformShowToastEvent';
import getGraphByAccountId from '@salesforce/apex/ContactTracingGraphCtrl.getGraphByAccountId';
import getGraphByEncounterId from '@salesforce/apex/ContactTracingGraphCtrl.getGraphByEncounterId';
import getGraphByContactId from '@salesforce/apex/ContactTracingGraphCtrl.getGraphByContactId';

import D3 from '@salesforce/resourceUrl/d3minjs11212020';

const types = ["Master-Detail", "Lookup"];


export default class ContactTracingGraph extends LightningElement {

    d3initialized = false;
    svg;
    data;
    @api recordId;

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
            accountId: this.recordId
        })
            .then(result => {
                this.data = result;
                this.initializeD3()
            })
            .catch(error => {
                console.error(error)
            })

    }

    initializeD3() {

        var links = this.data.links.map(d => Object.create(d));
        var nodes = this.data.nodes.map(d => Object.create(d));
        const height = 700;
        const width = 1200;
        console.log(this.data);
        console.log(links);
        console.log(nodes);
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("x", d3.forceX())
            .force("y", d3.forceY());

        this.svg = d3.select(this.template.querySelector(".d3"))
            .append('svg')
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .style("font", "12px sans-serif");

        var svg = this.svg;

        var color = d3.scaleOrdinal(types, d3.schemeCategory10);
        var ticked = () => {
            link.attr("d", linkArc);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        }

        var update = () => {
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
                        .on('click', nodeClicked);
                    ret.append("circle")
                        .attr("stroke", "white")
                        .attr("stroke-width", 1.5)
                        .attr("r", 4);
                    ret.append("text")
                        .attr("x", 8)
                        .attr("y", "0.31em")
                        .text(d => d.name)
                        .clone(true).lower()
                        .attr("fill", "none")
                        .attr("stroke", "white")
                        .attr("stroke-width", 3)
                    return ret;
                }
                );
            link = link
                .data(links, d => [d.source, d.target])
                .join("path");

            simulation.nodes(nodes);
            simulation.force("link").links(links);
            simulation.on("tick", () => {
                link.attr("d", linkArc);
                node.attr("transform", d => `translate(${d.x},${d.y})`);
            });
            simulation.alpha(1).restart();

        }



        const linkArc = d => {
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

        }

        var drag = simulation => {

            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }


        const nodeMouseOver = d => {
            // Highlight the nodes: every node is green except of him
            console.log("mouse over node", d);
            //node.style('fill', "#B8B8B8")
            d.target.setAttribute("style", "fill:#FF0000");
            //d3.select(this).style('fill', '#69b3b2')
            // Highlight the connections
            link
                .style('stroke', function (link_d) {
                    return link_d.source === d.target.__data__ || link_d.target === d.target.__data__ ? '#000000' : color(link_d.type);
                })
            /*.style('stroke-width', function (link_d) {
                return link_d.source === d.target.__data__ || link_d.target === d.target.__data__ ? 2 : 1.5;
            })*/
        };
        const nodeMouseOut = d => {

            d.target.setAttribute("style", "fill:#000000");
            link
                .style('stroke', dlink => color(dlink.type))
            //.style('stroke-width', '1.5')
        }

        const nodeClicked = d => {

            if (d.target.__data__.type === 'Contact') {
                getGraphByContactId({
                    contactId: d.target.__data__.id
                })
                    .then(result => {
                        console.log('NODE CLICKED');
                        console.log('this.data', this.data);
                        console.log('result', result);
                        const
                            mergedLinks = this.data.links.concat(result.links),
                            linkKeys = ['source', 'target'],
                            uniqueLinks = mergedLinks.filter(
                                (s => o =>
                                    (k => !s.has(k) && s.add(k))
                                        (linkKeys.map(k => o[k]).join('|'))
                                )
                                    (new Set)
                            );
                        const
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
                    })
                    .catch(error => {
                        console.error(error)
                    })
            }

            if (d.target.__data__.type === 'Encounter') {
                getGraphByEncounterId({
                    encounterId: d.target.__data__.id
                })
                    .then(result => {
                        console.log('NODE CLICKED');
                        console.log('this.data', this.data);
                        console.log('result', result);
                        const
                            mergedLinks = this.data.links.concat(result.links),
                            linkKeys = ['source', 'target'],
                            uniqueLinks = mergedLinks.filter(
                                (s => o =>
                                    (k => !s.has(k) && s.add(k))
                                        (linkKeys.map(k => o[k]).join('|'))
                                )
                                    (new Set)
                            );
                        const
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
                        update();
                    })
                    .catch(error => {
                        console.error(error)
                    })
            }
        }

        // Per-type markers, as they don't inherit styles.
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

        var link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke", d => color(d.type))
            .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);

        var node = svg.append("g")
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(drag(simulation))
            .on('mouseover', nodeMouseOver)
            .on('mouseout', nodeMouseOut)
            .on('click', nodeClicked);

        node.append("circle")
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("r", 4);

        node.append("text")
            .attr("x", 8)
            .attr("y", "0.31em")
            .text(d => d.name)
            .clone(true).lower()
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-width", 3);

        simulation.on("tick", () => {
            link.attr("d", linkArc);
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        //invalidation.then(() => simulation.stop());

    }


}