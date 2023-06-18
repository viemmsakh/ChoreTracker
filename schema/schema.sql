--
-- PostgreSQL database dump
--

-- Dumped from database version 15.3
-- Dumped by pg_dump version 15.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: gen_random_uuid(); Type: FUNCTION; Schema: public; Owner: ahenderson
--

CREATE FUNCTION public.gen_random_uuid() RETURNS uuid
    LANGUAGE sql
    AS $$ SELECT md5(random()::text || clock_timestamp()::text)::uuid $$;


ALTER FUNCTION public.gen_random_uuid() OWNER TO ahenderson;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth; Type: TABLE; Schema: public; Owner: ahenderson
--

CREATE TABLE public.auth (
    uuid uuid DEFAULT public.gen_random_uuid() NOT NULL,
    username character varying NOT NULL,
    hash character varying NOT NULL,
    ip inet NOT NULL,
    registered timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.auth OWNER TO ahenderson;

--
-- Name: chores; Type: TABLE; Schema: public; Owner: ahenderson
--

CREATE TABLE public.chores (
    chore uuid DEFAULT gen_random_uuid() NOT NULL,
    chore_member uuid NOT NULL,
    chore_name character varying NOT NULL,
    chore_description character varying,
    chore_assigned timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    chore_completed timestamp without time zone,
    chore_deadline timestamp without time zone,
    assigned_by uuid NOT NULL,
    chore_verified timestamp without time zone
);


ALTER TABLE public.chores OWNER TO ahenderson;

--
-- Name: family; Type: TABLE; Schema: public; Owner: ahenderson
--

CREATE TABLE public.family (
    unit uuid NOT NULL,
    unit_member uuid NOT NULL,
    unit_permission character varying(1) NOT NULL
);


ALTER TABLE public.family OWNER TO ahenderson;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: hendtlpg_chores
--

CREATE TABLE public.sessions (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    init timestamp without time zone DEFAULT now() NOT NULL,
    invalidated character varying(1) DEFAULT 'N'::character varying NOT NULL,
    requested_by uuid NOT NULL
);


ALTER TABLE public.sessions OWNER TO hendtlpg_chores;

--
-- Name: auth auth_pkey; Type: CONSTRAINT; Schema: public; Owner: ahenderson
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT auth_pkey PRIMARY KEY (uuid);


--
-- Name: chores chores_pkey; Type: CONSTRAINT; Schema: public; Owner: ahenderson
--

ALTER TABLE ONLY public.chores
    ADD CONSTRAINT chores_pkey PRIMARY KEY (chore);


--
-- Name: family family_pkey; Type: CONSTRAINT; Schema: public; Owner: ahenderson
--

ALTER TABLE ONLY public.family
    ADD CONSTRAINT family_pkey PRIMARY KEY (unit, unit_member);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: TABLE auth; Type: ACL; Schema: public; Owner: ahenderson
--

GRANT ALL ON TABLE public.auth TO hendtlpg_chores;


--
-- Name: TABLE chores; Type: ACL; Schema: public; Owner: ahenderson
--

GRANT ALL ON TABLE public.chores TO hendtlpg_chores;


--
-- Name: TABLE family; Type: ACL; Schema: public; Owner: ahenderson
--

GRANT ALL ON TABLE public.family TO hendtlpg_chores;


--
-- PostgreSQL database dump complete
--
