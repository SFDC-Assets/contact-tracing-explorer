public with sharing class ContactTracingGraphCtrl {


	private static String TYPE_MASTERDETAIL = 'Master-Detail';
	private static String TYPE_LOOKUP = 'Lookup';
	private static String TYPE_CONTACT = 'Contact';
	private static String TYPE_ENCOUNTER = 'Encounter';

	public class Node {
		@AuraEnabled
		public String id {get; set;}
		@AuraEnabled
		public String name {get; set;}
		@AuraEnabled
		public String type {get;set;}
		Node(String id, String name, String type) {
			this.id = id;
			this.name = name;
			this.type = type;
		}
	}

	public class Link {
		@AuraEnabled
		public String source {get; set;}
		@AuraEnabled
		public String target {get; set;}
		@AuraEnabled
		public String type {get; set;}
		Link(String source, String target, String type) {
			this.source = source;
			this.target = target;
			this.type = type;
		}
	}

	public class Graph {
		@AuraEnabled
		public List<Node> nodes {get; set;}
		@AuraEnabled
		public List<Link> links {get; set;}

		Graph() {
			this.nodes = new List<Node>();
			this.links = new List<Link>();
		}

		public void addNode(String id, String name, String type) {
			this.nodes.add(new Node(id,name,type));
		}

		public void addLink(String source, String target, String type) {
			if ((target != null) && (source != null)) {
				this.links.add(new Link(source,target,type));
			}
		}

	}


	public ContactTracingGraphCtrl() {
	}

	@AuraEnabled
	public static Graph getGraphByAccountId(String accountId){
		try {
			if (accountId == null) {
				accountId = '0013t00001ZufHGAAZ';
			}
			Account acct = [SELECT Id, PersonContactId from Account where Id = :accountId LIMIT 1];
			return getGraphByContactId(acct.PersonContactId);
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	@AuraEnabled
	public static Graph getGraphByContactId(String contactId){
		Set<String> encounterIds = new Set<String>();
		Graph graph = new Graph();

		try {
			Contact contact =
			[SELECT Id, Name from Contact
			 WHERE Id = :contactId
			            LIMIT 1];
			graph.addNode(contact.Id, contact.Name, TYPE_CONTACT);
			ContactEncounterParticipant[] participants =
			[SELECT Id, Name, ContactId, LeadId, ContactEncounterId
			 FROM ContactEncounterParticipant
			 WHERE ContactId = :contactId];
			for ( ContactEncounterParticipant participant : participants ) {
				encounterIds.add(participant.ContactEncounterId);
				graph.addLink(contactId,participant.ContactEncounterId,TYPE_LOOKUP);
			}
			ContactEncounter[] encounters =
			[SELECT Id, Name, LocationId
			 FROM ContactEncounter
			 WHERE Id in :encounterIds];
			for (ContactEncounter encounter : encounters) {
				graph.addNode(encounter.Id, encounter.Name, TYPE_ENCOUNTER);
			}
			return graph;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	@AuraEnabled
	public static Graph getGraphByEncounterId(String encounterId){
		Set<String> contactIds = new Set<String>();
		Graph graph = new Graph();

		try {
			ContactEncounter encounter =
			[SELECT Id, Name from ContactEncounter
			 WHERE Id = :encounterId
			 LIMIT 1];
			graph.addNode(encounter.Id, encounter.Name, TYPE_ENCOUNTER);
			ContactEncounterParticipant[] participants =
			[SELECT Id, Name, ContactId, LeadId, ContactEncounterId
			 FROM ContactEncounterParticipant
			 WHERE ContactEncounterId = :encounterId];
			for ( ContactEncounterParticipant participant : participants ) {
				contactIds.add(participant.ContactId);
				graph.addLink(participant.ContactId,participant.ContactEncounterId,TYPE_LOOKUP);
			}
			Contact[] contacts =
			[SELECT Id, Name
			 FROM Contact
			 WHERE Id in :contactIds];
			for (Contact contact : contacts) {
				graph.addNode(contact.Id, contact.Name, TYPE_CONTACT);
			}
			return graph;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}


}
