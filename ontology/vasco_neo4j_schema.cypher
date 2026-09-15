// Vasco Neo4j Schema v1
//
// Constraints e indices para materializar vasco_sports_ontology_v1.yaml
// no Knowledge Graph. Rodar uma vez contra uma instancia nova (local ou
// Neo4j Aura) antes do primeiro load de dados.
//
// Convencao: toda label carrega um `id` (UUID, string) como chave logica
// unica — o mesmo `id` usado nas tabelas Postgres da camada de Identity,
// para permitir join entre os dois mundos sem duplicar geracao de chave.

// ---------------------------------------------------------------------
// CORE
// ---------------------------------------------------------------------
CREATE CONSTRAINT club_id IF NOT EXISTS FOR (n:Club) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT fan_id IF NOT EXISTS FOR (n:Fan) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT employee_id IF NOT EXISTS FOR (n:Employee) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT membership_id IF NOT EXISTS FOR (n:Membership) REQUIRE n.id IS UNIQUE;

CREATE INDEX person_email_hash IF NOT EXISTS FOR (n:Person) ON (n.email_hash);
CREATE INDEX fan_person_id IF NOT EXISTS FOR (n:Fan) ON (n.person_id);
CREATE INDEX membership_status IF NOT EXISTS FOR (n:Membership) ON (n.status);
CREATE INDEX membership_renews_at IF NOT EXISTS FOR (n:Membership) ON (n.renews_at);

// ---------------------------------------------------------------------
// SPORT
// ---------------------------------------------------------------------
CREATE CONSTRAINT team_id IF NOT EXISTS FOR (n:Team) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT player_id IF NOT EXISTS FOR (n:Player) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT competition_id IF NOT EXISTS FOR (n:Competition) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT season_id IF NOT EXISTS FOR (n:Season) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT venue_id IF NOT EXISTS FOR (n:Venue) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT match_id IF NOT EXISTS FOR (n:Match) REQUIRE n.id IS UNIQUE;

CREATE INDEX match_scheduled_at IF NOT EXISTS FOR (n:Match) ON (n.scheduled_at);
CREATE INDEX match_status IF NOT EXISTS FOR (n:Match) ON (n.status);
CREATE INDEX season_year IF NOT EXISTS FOR (n:Season) ON (n.year);

// ---------------------------------------------------------------------
// FAN INTELLIGENCE
// ---------------------------------------------------------------------
CREATE CONSTRAINT fan_profile_id IF NOT EXISTS FOR (n:FanProfile) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT fan_segment_id IF NOT EXISTS FOR (n:FanSegment) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT engagement_event_id IF NOT EXISTS FOR (n:EngagementEvent) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT churn_risk_id IF NOT EXISTS FOR (n:ChurnRisk) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT fan_survey_id IF NOT EXISTS FOR (n:FanSurvey) REQUIRE n.id IS UNIQUE;

CREATE INDEX fan_profile_engagement_score IF NOT EXISTS FOR (n:FanProfile) ON (n.engagement_score);
CREATE INDEX fan_segment_name IF NOT EXISTS FOR (n:FanSegment) ON (n.name);
CREATE INDEX engagement_event_occurred_at IF NOT EXISTS FOR (n:EngagementEvent) ON (n.occurred_at);
CREATE INDEX engagement_event_type IF NOT EXISTS FOR (n:EngagementEvent) ON (n.event_type);
CREATE INDEX churn_risk_score IF NOT EXISTS FOR (n:ChurnRisk) ON (n.risk_score);
CREATE INDEX churn_risk_calculated_at IF NOT EXISTS FOR (n:ChurnRisk) ON (n.calculated_at);

// ---------------------------------------------------------------------
// COMMERCIAL
// ---------------------------------------------------------------------
CREATE CONSTRAINT sponsor_id IF NOT EXISTS FOR (n:Sponsor) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT sponsorship_contract_id IF NOT EXISTS FOR (n:SponsorshipContract) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT sponsor_activation_id IF NOT EXISTS FOR (n:SponsorActivation) REQUIRE n.id IS UNIQUE;

CREATE INDEX sponsorship_contract_dates IF NOT EXISTS FOR (n:SponsorshipContract) ON (n.starts_at, n.ends_at);

// ---------------------------------------------------------------------
// COMMERCE
// ---------------------------------------------------------------------
CREATE CONSTRAINT product_id IF NOT EXISTS FOR (n:Product) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT product_sku IF NOT EXISTS FOR (n:Product) REQUIRE n.sku IS UNIQUE;
CREATE CONSTRAINT order_id IF NOT EXISTS FOR (n:Order) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT order_item_id IF NOT EXISTS FOR (n:OrderItem) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT ticket_id IF NOT EXISTS FOR (n:Ticket) REQUIRE n.id IS UNIQUE;

CREATE INDEX order_placed_at IF NOT EXISTS FOR (n:Order) ON (n.placed_at);
CREATE INDEX order_status IF NOT EXISTS FOR (n:Order) ON (n.status);
CREATE INDEX ticket_checked_in_at IF NOT EXISTS FOR (n:Ticket) ON (n.checked_in_at);

// ---------------------------------------------------------------------
// MEDIA
// ---------------------------------------------------------------------
CREATE CONSTRAINT social_account_id IF NOT EXISTS FOR (n:SocialAccount) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT media_content_id IF NOT EXISTS FOR (n:MediaContent) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT media_consumption_id IF NOT EXISTS FOR (n:MediaConsumption) REQUIRE n.id IS UNIQUE;

CREATE INDEX media_content_published_at IF NOT EXISTS FOR (n:MediaContent) ON (n.published_at);
CREATE INDEX media_consumption_occurred_at IF NOT EXISTS FOR (n:MediaConsumption) ON (n.occurred_at);
CREATE INDEX media_consumption_type IF NOT EXISTS FOR (n:MediaConsumption) ON (n.interaction_type);

// ---------------------------------------------------------------------
// Relationships are NOT constrained by schema in Neo4j (no fixed DDL) —
// the edge types below are created by the loader/seed script and must
// match vasco_sports_ontology_v1.yaml exactly:
//
// (:Fan)-[:IS_A]->(:Person)
// (:Employee)-[:IS_A]->(:Person)
// (:Fan)-[:HAS_MEMBERSHIP]->(:Membership)
// (:Employee)-[:EMPLOYED_BY]->(:Club)
// (:Player)-[:PLAYS_FOR]->(:Team)
// (:Team)-[:PART_OF]->(:Club)
// (:Season)-[:EDITION_OF]->(:Competition)
// (:Match)-[:PART_OF]->(:Season)
// (:Match)-[:HELD_AT]->(:Venue)
// (:Match)-[:HOME_TEAM]->(:Team)
// (:Match)-[:AWAY_TEAM]->(:Team)
// (:Fan)-[:FAVORITE_PLAYER]->(:Player)
// (:FanProfile)-[:PROFILE_OF]->(:Fan)
// (:Fan)-[:BELONGS_TO_SEGMENT]->(:FanSegment)
// (:EngagementEvent)-[:PERFORMED_BY]->(:Fan)
// (:ChurnRisk)-[:RISK_OF]->(:Membership)
// (:FanSurvey)-[:ANSWERED_BY]->(:Fan)
// (:SponsorshipContract)-[:CONTRACT_OF]->(:Sponsor)
// (:SponsorshipContract)-[:SPONSORS]->(:Club)
// (:SponsorActivation)-[:ACTIVATES]->(:SponsorshipContract)
// (:SponsorActivation)-[:DURING]->(:Match)
// (:Order)-[:PLACED_BY]->(:Fan)
// (:OrderItem)-[:LINE_OF]->(:Order)
// (:OrderItem)-[:FOR_PRODUCT]->(:Product)
// (:Ticket)-[:ISSUED_FROM]->(:OrderItem)
// (:Ticket)-[:ADMITS_TO]->(:Match)
// (:Ticket)-[:HELD_BY]->(:Fan)
// (:MediaContent)-[:PUBLISHED_ON]->(:SocialAccount)
// (:MediaContent)-[:ABOUT]->(:Match)
// (:MediaConsumption)-[:INTERACTION_WITH]->(:MediaContent)
// (:MediaConsumption)-[:BY_FAN]->(:Fan)
