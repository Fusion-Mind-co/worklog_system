--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

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
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 繝医Μ繧ｬ繝ｼ縺・UPDATE 謫堺ｽ懊↓繧医▲縺ｦ蜻ｼ縺ｳ蜃ｺ縺輔ｌ縺溷ｴ蜷医・縺ｿ updated_at 繧定ｨｭ螳・
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    permission_id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    is_edited boolean DEFAULT false NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_messages_id_seq OWNER TO postgres;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: chat_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    partner_id integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.chat_permissions OWNER TO postgres;

--
-- Name: chat_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_permissions_id_seq OWNER TO postgres;

--
-- Name: chat_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_permissions_id_seq OWNED BY public.chat_permissions.id;


--
-- Name: password_reset_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(100),
    created_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone,
    is_used boolean NOT NULL,
    used_at timestamp without time zone,
    requires_admin boolean NOT NULL,
    admin_note text,
    is_handled boolean NOT NULL,
    handled_at timestamp without time zone,
    handled_by_id integer
);


ALTER TABLE public.password_reset_requests OWNER TO postgres;

--
-- Name: password_reset_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_requests_id_seq OWNER TO postgres;

--
-- Name: password_reset_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_requests_id_seq OWNED BY public.password_reset_requests.id;


--
-- Name: unit_names; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit_names (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE public.unit_names OWNER TO postgres;

--
-- Name: unit_names_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unit_names_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unit_names_id_seq OWNER TO postgres;

--
-- Name: unit_names_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unit_names_id_seq OWNED BY public.unit_names.id;


--
-- Name: unit_work_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit_work_types (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    work_type_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.unit_work_types OWNER TO postgres;

--
-- Name: unit_work_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unit_work_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unit_work_types_id_seq OWNER TO postgres;

--
-- Name: unit_work_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unit_work_types_id_seq OWNED BY public.unit_work_types.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    employee_id character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    department_name character varying(50) NOT NULL,
    "position" character varying(50) NOT NULL,
    email character varying(100),
    password_hash text NOT NULL,
    role_level integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    default_unit character varying(100),
    last_active_page character varying(50),
    sound_enabled boolean DEFAULT true
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone
);


ALTER TABLE public.work_types OWNER TO postgres;

--
-- Name: work_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_types_id_seq OWNER TO postgres;

--
-- Name: work_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_types_id_seq OWNED BY public.work_types.id;


--
-- Name: worklogs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.worklogs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.worklogs_id_seq OWNER TO postgres;

--
-- Name: worklogs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.worklogs (
    id integer DEFAULT nextval('public.worklogs_id_seq'::regclass) NOT NULL,
    employee_id character varying(10) NOT NULL,
    row_number integer,
    date date NOT NULL,
    model character varying(50),
    serial_number character varying(50),
    work_order character varying(50),
    part_number character varying(50),
    order_number character varying(50),
    quantity integer,
    unit_name character varying(50) NOT NULL,
    work_type character varying(50) NOT NULL,
    minutes integer NOT NULL,
    remarks text,
    status character varying(20),
    edit_reason text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    original_id integer
);


ALTER TABLE public.worklogs OWNER TO postgres;

--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: chat_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_permissions ALTER COLUMN id SET DEFAULT nextval('public.chat_permissions_id_seq'::regclass);


--
-- Name: password_reset_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests ALTER COLUMN id SET DEFAULT nextval('public.password_reset_requests_id_seq'::regclass);


--
-- Name: unit_names id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_names ALTER COLUMN id SET DEFAULT nextval('public.unit_names_id_seq'::regclass);


--
-- Name: unit_work_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_work_types ALTER COLUMN id SET DEFAULT nextval('public.unit_work_types_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_types ALTER COLUMN id SET DEFAULT nextval('public.work_types_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_permissions chat_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_permissions
    ADD CONSTRAINT chat_permissions_pkey PRIMARY KEY (id);


--
-- Name: password_reset_requests password_reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_pkey PRIMARY KEY (id);


--
-- Name: password_reset_requests password_reset_requests_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_token_key UNIQUE (token);


--
-- Name: unit_names unit_names_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_names
    ADD CONSTRAINT unit_names_name_key UNIQUE (name);


--
-- Name: unit_names unit_names_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_names
    ADD CONSTRAINT unit_names_pkey PRIMARY KEY (id);


--
-- Name: unit_work_types unit_work_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_work_types
    ADD CONSTRAINT unit_work_types_pkey PRIMARY KEY (id);


--
-- Name: unit_work_types uq_unit_work_type; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_work_types
    ADD CONSTRAINT uq_unit_work_type UNIQUE (unit_id, work_type_id);


--
-- Name: users users_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_types work_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_types
    ADD CONSTRAINT work_types_name_key UNIQUE (name);


--
-- Name: work_types work_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_types
    ADD CONSTRAINT work_types_pkey PRIMARY KEY (id);


--
-- Name: idx_worklog_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_worklog_date ON public.worklogs USING btree (date);


--
-- Name: idx_worklog_employee_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_worklog_employee_date ON public.worklogs USING btree (employee_id, date);


--
-- Name: idx_worklog_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_worklog_employee_id ON public.worklogs USING btree (employee_id);


--
-- Name: idx_worklog_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_worklog_status ON public.worklogs USING btree (status);


--
-- Name: idx_worklog_status_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_worklog_status_date ON public.worklogs USING btree (status, date);


--
-- Name: idx_worklog_unit_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_worklog_unit_date ON public.worklogs USING btree (unit_name, date);


--
-- Name: idx_worklog_unit_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_worklog_unit_name ON public.worklogs USING btree (unit_name);


--
-- Name: chat_messages update_chat_messages_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_chat_messages_timestamp BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: unit_names update_unit_names_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_unit_names_timestamp BEFORE UPDATE ON public.unit_names FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: work_types update_work_types_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_work_types_timestamp BEFORE UPDATE ON public.work_types FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: chat_messages chat_messages_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.chat_permissions(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_permissions chat_permissions_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_permissions
    ADD CONSTRAINT chat_permissions_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_permissions chat_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_permissions
    ADD CONSTRAINT chat_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_requests password_reset_requests_handled_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_handled_by_id_fkey FOREIGN KEY (handled_by_id) REFERENCES public.users(id);


--
-- Name: password_reset_requests password_reset_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_requests
    ADD CONSTRAINT password_reset_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: unit_work_types unit_work_types_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_work_types
    ADD CONSTRAINT unit_work_types_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit_names(id) ON DELETE CASCADE;


--
-- Name: unit_work_types unit_work_types_work_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_work_types
    ADD CONSTRAINT unit_work_types_work_type_id_fkey FOREIGN KEY (work_type_id) REFERENCES public.work_types(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

