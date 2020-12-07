# Contact Tracing LWC
Author : Mark Lott mlott@salesforce.com

This is a d3.js based interactive contact tracing graph

To use, add the contactTracingGraph component to the Account object page layout in Work.com
Double click to expand nodes, right click to get context on the node.
Can filter on a date range, so now you can have interessting contact tracing discussions.

[screenshot1](/doc/screenshot1.png)
[screenshot2](/doc/screenshot2.png)

## Installation
Since this is a lightning web component, you need to use the CLI to install the component in your work.com demo org:

Unzip the repo into a working directory

sfdx force:auth:web:login --setalias myworkdotcomdemoorg
sfdx force:source:deploy --sourcepath ./ContactTracingGraph/force-app -u myworkdotcomdemoorg


## to-dos
Documentation:

done -- zoom in / zoom out of graph  
done -- move graph on x / y axis
done -- recenter graph on root node
done -- add date filter capability
done -- relabel the legend
done -- add undo feature to collapse nodes
done -- complete the popup card and make pretty

done --fix popup dialog x,y issue in firefox.
done --refactor to get rid of warnings
