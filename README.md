# Contact Tracing LWC

This is a d3.js based interactive contact tracing graph for Work.com

This component depends on Health Cloud or Work.com

To use, add the contactTracingGraph component to the Account object page layout in Work.com<br>
To interact with the graph: double click to expand nodes, right click to get context on the node.<br>
Can filter on date ranges as well.<br>

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
