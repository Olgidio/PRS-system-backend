--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5



CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
--

CREATE FUNCTION public.enforce_positive_inventory() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.quantity < 0 THEN
    RAISE EXCEPTION 'Inventory stock cannot go below zero (inventory_id = %)', NEW.inventory_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_inventory_change(); Type: FUNCTION; Schema: public;  
--

CREATE FUNCTION public.log_inventory_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    acting_user INT;
BEGIN
    acting_user := current_setting('app.user_id', true)::INT;
    INSERT INTO audit_logs(user_id, action_type, table_name, record_id)
    VALUES (
        acting_user,
        TG_OP,
        TG_TABLE_NAME,
        NEW.inventory_id
    );
    RETURN NEW;
END;
$$;



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public;  
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    user_id integer,
    action_type character varying(10),
    table_name character varying(50),
    record_id integer,
    log_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public;  
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public;  
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- Name: documents; Type: TABLE; Schema: public;  
--

CREATE TABLE public.documents (
    doc_id integer NOT NULL,
    mime_type character varying(50) NOT NULL,
    doc_name character varying(100) NOT NULL,
    cloud_url character varying(255) NOT NULL,
    user_id integer NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    uploaded_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer
);


--
-- Name: documents_doc_id_seq; Type: SEQUENCE; Schema: public;  
--

CREATE SEQUENCE public.documents_doc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: documents_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public;  
--

ALTER SEQUENCE public.documents_doc_id_seq OWNED BY public.documents.doc_id;


--


CREATE TABLE public.encryption_keys (
    key_id integer NOT NULL,
    key_type character varying(50) NOT NULL,
    key_value text NOT NULL,
    scope character varying(50),
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    CONSTRAINT valid_scope CHECK (((scope)::text = ANY ((ARRAY['national_identifiers'::character varying, 'documents'::character varying])::text[])))
);

--
-- Name: encryption_keys_key_id_seq; Type: SEQUENCE; Schema: public;  
--

CREATE SEQUENCE public.encryption_keys_key_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encryption_keys_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public;  
--

ALTER SEQUENCE public.encryption_keys_key_id_seq OWNED BY public.encryption_keys.key_id;


--
-- Name: inventory; Type: TABLE; Schema: public;  
--

CREATE TABLE public.inventory (
    inventory_id integer NOT NULL,
    item_type character varying(50) NOT NULL,
    item_subtype character varying(50),
    quantity integer NOT NULL,
    unit character varying(20) DEFAULT 'units'::character varying,
    location_id integer,
    merchant_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer,
    CONSTRAINT inventory_quantity_check CHECK ((quantity >= 0))
);



--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE; Schema: public;  
--

CREATE SEQUENCE public.inventory_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public;  
--

ALTER SEQUENCE public.inventory_inventory_id_seq OWNED BY public.inventory.inventory_id;


--
-- Name: item_catalog; Type: TABLE; Schema: public;  
--

CREATE TABLE public.item_catalog (
    item_type character varying(50) NOT NULL,
    item_subtype character varying(50) NOT NULL,
    description text
);



--
-- Name: locations; Type: TABLE; Schema: public;  
--

CREATE TABLE public.locations (
    location_id integer NOT NULL,
    location_name character varying(100) NOT NULL,
    location_type character varying(50) NOT NULL,
    address character varying(255),
    city character varying(100),
    postcode character varying(10),
    country character varying(50) DEFAULT 'United Kingdom'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer,
    CONSTRAINT locations_location_type_check CHECK (((location_type)::text = ANY ((ARRAY['pharmacy'::character varying, 'supermarket'::character varying, 'hospital'::character varying, 'testing_site'::character varying, 'clinic'::character varying, 'distribution_center'::character varying, 'government_facility'::character varying])::text[])))
);


--
-- Name: locations_location_id_seq; Type: SEQUENCE; Schema: public;  
--

CREATE SEQUENCE public.locations_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: 
--

ALTER SEQUENCE public.locations_location_id_seq OWNED BY public.locations.location_id;


--
--

CREATE TABLE public.merchants (
    user_id integer NOT NULL,
    store_name character varying(100),
    business_vat character varying(50) NOT NULL,
    address character varying(255) NOT NULL,
    region character varying(100),
    business_name text,
    company_number character varying(20),
    verified boolean DEFAULT false
);


--
-- Name: national_identifiers; Type: TABLE; Schema: public; 
--

CREATE TABLE public.national_identifiers (
    user_id integer NOT NULL,
    prs_id uuid NOT NULL,
    passport_num character varying(9),
    dob date NOT NULL,
    national_insurance_number bigint,
    drivers_licence_number character varying(18),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer,
    national_identifier character varying(100),
    nhs_number character varying(10) NOT NULL
);


--
-- Name: officials; Type: TABLE; Schema: public; Owner:
--

CREATE TABLE public.officials (
    user_id integer NOT NULL,
    department character varying(100),
    clearance_level integer,
    CONSTRAINT officials_clearance_level_check CHECK ((clearance_level >= 0))
);



--
-- Name: order_items; Type: TABLE; Schema: public;
--

CREATE TABLE public.order_items (
    order_item_id integer NOT NULL,
    order_id integer NOT NULL,
    inventory_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: order_items_order_item_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.order_items_order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: order_items_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; 
--

ALTER SEQUENCE public.order_items_order_item_id_seq OWNED BY public.order_items.order_item_id;



--

CREATE TABLE public.orders (
    order_id integer NOT NULL,
    user_id integer NOT NULL,
    merchant_id integer NOT NULL,
    order_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_amount numeric(10,2)
);



--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; 

CREATE SEQUENCE public.orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; 
--

ALTER SEQUENCE public.orders_order_id_seq OWNED BY public.orders.order_id;


--
-- Name: purchase_restrictions; Type: TABLE; Schema: public;
--

CREATE TABLE public.purchase_restrictions (
    item_type character varying(50) NOT NULL,
    item_subtype character varying(50) NOT NULL,
    max_quantity_per_user integer,
    allowed_days text[],
    per_period character varying(20)
);



--
-- Name: roles; Type: TABLE; Schema: public; Owner:
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(25) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer,
    description character varying(255)
);

--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; 
--

CREATE SEQUENCE public.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; 
--

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;


--
-- Name: users; Type: TABLE; Schema: public;
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    prs_id uuid NOT NULL,
    first_name character varying(35) NOT NULL,
    middle_name character varying(35),
    last_name character varying(90),
    mobile_phone bigint NOT NULL,
    home_phone bigint,
    work_phone bigint,
    home_address character varying(150) NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer,
    password_hash character varying(100) NOT NULL,
    email public.citext NOT NULL
);





--
-- Name: user_purchase_log; Type: VIEW; Schema: public; 
--

CREATE VIEW public.user_purchase_log AS
 SELECT o.order_id,
    o.order_date,
    u.user_id,
    concat(u.first_name, ' ', COALESCE(((u.middle_name)::text || ' '::text), ''::text), u.last_name) AS buyer,
    concat(m.first_name, ' ', COALESCE(((m.middle_name)::text || ' '::text), ''::text), m.last_name) AS merchant,
    i.item_type,
    i.item_subtype,
    oi.quantity,
    oi.unit_price,
    ((oi.quantity)::numeric * oi.unit_price) AS total_cost
   FROM (((((public.orders o
     JOIN public.users u ON ((o.user_id = u.user_id)))
     JOIN public.users m ON ((o.merchant_id = m.user_id)))
     JOIN public.order_items oi ON ((o.order_id = oi.order_id)))
     JOIN public.inventory inv ON ((oi.inventory_id = inv.inventory_id)))
     JOIN public.item_catalog i ON ((((inv.item_type)::text = (i.item_type)::text) AND ((inv.item_subtype)::text = (i.item_subtype)::text))));




--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; 
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: vaccines; Type: TABLE; Schema: public; 
--

CREATE TABLE public.vaccines (
    vaccine_id integer NOT NULL,
    vaccine_name character varying(100) NOT NULL,
    manufacturer character varying(100) NOT NULL,
    lot_number character varying(100) NOT NULL,
    vaccine_exp_date timestamp without time zone NOT NULL,
    renew_period public.renew_period_enum NOT NULL,
    pregnancy_safe boolean NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_by integer
);




--
-- Name: vaccines_vaccine_id_seq; Type: SEQUENCE; Schema: public; 
--

CREATE SEQUENCE public.vaccines_vaccine_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;




--
-- Name: vaccines_vaccine_id_seq; Type: SEQUENCE OWNED BY; Schema: public;
--

ALTER SEQUENCE public.vaccines_vaccine_id_seq OWNED BY public.vaccines.vaccine_id;


--
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- Name: documents doc_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.documents ALTER COLUMN doc_id SET DEFAULT nextval('public.documents_doc_id_seq'::regclass);


--
-- Name: encryption_keys key_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.encryption_keys ALTER COLUMN key_id SET DEFAULT nextval('public.encryption_keys_key_id_seq'::regclass);


--
-- Name: inventory inventory_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.inventory ALTER COLUMN inventory_id SET DEFAULT nextval('public.inventory_inventory_id_seq'::regclass);


--
-- Name: locations location_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.locations ALTER COLUMN location_id SET DEFAULT nextval('public.locations_location_id_seq'::regclass);


--
-- Name: order_items order_item_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.order_items ALTER COLUMN order_item_id SET DEFAULT nextval('public.order_items_order_item_id_seq'::regclass);


--
-- Name: orders order_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.orders ALTER COLUMN order_id SET DEFAULT nextval('public.orders_order_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: vaccines vaccine_id; Type: DEFAULT; Schema: public; 
--

ALTER TABLE ONLY public.vaccines ALTER COLUMN vaccine_id SET DEFAULT nextval('public.vaccines_vaccine_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; 
--



--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (doc_id);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (key_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: item_catalog item_catalog_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.item_catalog
    ADD CONSTRAINT item_catalog_pkey PRIMARY KEY (item_type, item_subtype);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (location_id);


--
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (user_id);


--
-- Name: national_identifiers national_identifiers_drivers_licence_number_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_drivers_licence_number_key UNIQUE (drivers_licence_number);


--
-- Name: national_identifiers national_identifiers_national_identifier_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_national_identifier_key UNIQUE (national_identifier);


--
-- Name: national_identifiers national_identifiers_nhs_number_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_nhs_number_key UNIQUE (nhs_number);


--
-- Name: national_identifiers national_identifiers_nin_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_nin_key UNIQUE (national_insurance_number);


--
-- Name: national_identifiers national_identifiers_passport_num_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_passport_num_key UNIQUE (passport_num);


--
-- Name: national_identifiers national_identifiers_pkey; Type: CONSTRAINT; Schema: public; 

--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_pkey PRIMARY KEY (user_id);


--
-- Name: national_identifiers national_identifiers_prs_id_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_prs_id_key UNIQUE (prs_id);


--
-- Name: officials officials_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.officials
    ADD CONSTRAINT officials_pkey PRIMARY KEY (user_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: purchase_restrictions purchase_restrictions_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.purchase_restrictions
    ADD CONSTRAINT purchase_restrictions_pkey PRIMARY KEY (item_type, item_subtype);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_prs_id_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_prs_id_key UNIQUE (prs_id);


--
-- Name: vaccines vaccines_pkey; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.vaccines
    ADD CONSTRAINT vaccines_pkey PRIMARY KEY (vaccine_id);


--
-- Name: vaccines vaccines_vaccine_name_key; Type: CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.vaccines
    ADD CONSTRAINT vaccines_vaccine_name_key UNIQUE (vaccine_name);


--
-- Name: idx_inventory_subtype; Type: INDEX; Schema: public; 
--

CREATE INDEX idx_inventory_subtype ON public.inventory USING btree (item_subtype);


--
-- Name: idx_inventory_type; Type: INDEX; Schema: public;
--

CREATE INDEX idx_inventory_type ON public.inventory USING btree (item_type);


--
-- Name: inventory trg_audit_inventory; Type: TRIGGER; Schema: public;
--

CREATE TRIGGER trg_audit_inventory AFTER INSERT OR DELETE OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.log_inventory_change();


--
-- Name: inventory trg_enforce_inventory_positive; Type: TRIGGER; Schema: public;
--

CREATE TRIGGER trg_enforce_inventory_positive BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.enforce_positive_inventory();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; 
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: audit_logs fk_audit_user; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: users fk_created_by; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: merchants fk_merchant_user; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT fk_merchant_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: officials fk_official_user; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.officials
    ADD CONSTRAINT fk_official_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: order_items fk_order_item_inventory; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_item_inventory FOREIGN KEY (inventory_id) REFERENCES public.inventory(inventory_id) ON DELETE CASCADE;


--
-- Name: order_items fk_order_item_order; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES public.orders(order_id) ON DELETE CASCADE;


--
-- Name: orders fk_order_merchant; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_order_merchant FOREIGN KEY (merchant_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: orders fk_order_user; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: purchase_restrictions fk_pr_item; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.purchase_restrictions
    ADD CONSTRAINT fk_pr_item FOREIGN KEY (item_type, item_subtype) REFERENCES public.item_catalog(item_type, item_subtype);


--
-- Name: users fk_role_id; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_role_id FOREIGN KEY (role_id) REFERENCES public.roles(role_id);


--
-- Name: users fk_updated_by; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: inventory inventory_created_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inventory inventory_item_type_item_subtype_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_item_type_item_subtype_fkey FOREIGN KEY (item_type, item_subtype) REFERENCES public.item_catalog(item_type, item_subtype);


--
-- Name: inventory inventory_location_id_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(location_id);


--
-- Name: inventory inventory_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inventory inventory_updated_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: locations locations_created_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: locations locations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: national_identifiers national_identifiers_created_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: national_identifiers national_identifiers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: national_identifiers national_identifiers_user_id_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.national_identifiers
    ADD CONSTRAINT national_identifiers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: roles roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: roles roles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: vaccines vaccines_created_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.vaccines
    ADD CONSTRAINT vaccines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vaccines vaccines_updated_by_fkey; Type: FK CONSTRAINT; Schema: public;  
--

ALTER TABLE ONLY public.vaccines
    ADD CONSTRAINT vaccines_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

