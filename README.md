# Contact Tracing LWC
Author : Mark Lott mlott@salesforce.com

This is a d3.js based interactive contact tracing graph

To use, add the contactTracingGraph component to the Account object page layout in Work.com
Double click to expand nodes, right click to get context on the node.
Can filter on a date range, so now you can have interessting contact tracing discussions.

The screenshot below shows it added to an account record page. The graph will center on the account (i.e. employee) you are looking at.

![screenshot1](/doc/screenshot1.png)

To expand the graph, double click on a node - If there are relationships, they will be added to the graph.
Right click on a node to get a context menu with details.

![screenshot2](/doc/screenshot2.png)

## Installation
Since this is a lightning web component, you need to use the CLI to install the component in your work.com demo org:

If you don't have the CLI installed, you can download it from:
https://developer.salesforce.com/tools/sfdxcli

Unzip the repo into a working directory

`sfdx force:auth:web:login --setalias myworkdotcomdemoorg`<br>
`sfdx force:source:deploy --sourcepath ./ContactTracingGraph/force-app -u myworkdotcomdemoorg`
