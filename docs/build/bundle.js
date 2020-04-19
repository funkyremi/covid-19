
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const profileSchema = [
      { key: "prenom", value: "Prénom" },
      { key: "nom", value: "Nom" },
      { key: "dateDeNaissance", value: "Date de naissance" },
      { key: "lieuDeNaissance", value: "Lieu de naissance" },
      { key: "addresse", value: "Addresse" },
      { key: "ville", value: "Ville" },
      { key: "codePostal", value: "Code postal" }
    ];

    const reasons = [
      {
        shortText: "Travail",
        text: `Déplacements entre le domicile et le lieu d’exercice de l’activité professionnelle, lorsqu'ils sont indispensables à l'exercice d’activités ne pouvant être organisées sous forme de télétravail ou déplacements professionnels ne pouvant être différés.`,
        position: ["x", 76, 527, 19],
        faIcon: 'building',
      },
      {
        shortText: "Courses",
        text: `Déplacements pour effectuer des achats de fournitures nécessaires à l’activité professionnelle et des achats de première nécessité dans des établissements dont les activités demeurent autorisées (liste des commerces et établissements qui restent ouverts).`,
        position: ["x", 76, 478, 19],
        faIcon: 'shopping-cart',
      },
      {
        shortText: "Santé",
        text: `Consultations et soins ne pouvant être assurés à distance et ne pouvant être différés ; consultations et soins des patients atteints d'une affection de longue durée.`,
        position: ["x", 76, 436, 19],
        faIcon: 'heartbeat',
      },
      {
        shortText: "Famille",
        text: `Déplacements pour motif familial impérieux, pour l’assistance aux personnes vulnérables ou la garde d’enfants.`,
        position: ["x", 76, 400, 19],
        faIcon: 'users',
      },
      {
        shortText: "Sport",
        text: `Déplacements brefs, dans la limite d'une heure quotidienne et dans un rayon maximal d'un kilomètre autour du domicile, liés soit à l'activité physique individuelle des personnes, à l'exclusion de toute pratique sportive collective et de toute proximité avec d'autres personnes, soit à la promenade avec les seules personnes regroupées dans un même domicile, soit aux besoins des animaux de compagnie.`,
        position: ["x", 76, 345, 19],
        faIcon: 'running',
      },
      {
        shortText: "Judiciaire",
        text: `Convocation judiciaire ou administrative.`,
        position: ["x", 76, 298, 19],
        faIcon: 'balance-scale',
      },
      {
        shortText: "Mission",
        text: `Participation à des missions d’intérêt général sur demande de l’autorité administrative.`,
        position: ["x", 76, 260, 19],
        faIcon: 'hands-helping',
      }
    ];

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const createWritableStore = (key, startValue) => {
      const { subscribe, set, update } = writable(startValue);

      return {
        subscribe,
        set,
        update,
        get: () => {
          return localStorage.getItem(key)|| [];
        },
        useLocalStorage: () => {
          const json = localStorage.getItem(key);
          if (json) {
            set(JSON.parse(json));
          }
          subscribe(current => {
            localStorage.setItem(key, JSON.stringify(current));
          });
        }
      };
    };

    const profiles = createWritableStore("profiles", []);
    const settings = createWritableStore("settings", {
      createdXMinutesAgo: 30,
      selectedReason: reasons[4]
    });

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }

    /*
     * The `chars`, `lookup`, `encode`, and `decode` members of this file are
     * licensed under the following:
     *
     *     base64-arraybuffer
     *     https://github.com/niklasvh/base64-arraybuffer
     *
     *     Copyright (c) 2012 Niklas von Hertzen
     *     Licensed under the MIT license.
     *
     */
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    // Use a lookup table to find the index.
    var lookup = new Uint8Array(256);
    for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    var encodeToBase64 = function (bytes) {
        var base64 = '';
        var len = bytes.length;
        for (var i = 0; i < len; i += 3) {
            base64 += chars[bytes[i] >> 2];
            base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += chars[bytes[i + 2] & 63];
        }
        if (len % 3 === 2) {
            base64 = base64.substring(0, base64.length - 1) + '=';
        }
        else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + '==';
        }
        return base64;
    };
    var decodeFromBase64 = function (base64) {
        var bufferLength = base64.length * 0.75;
        var len = base64.length;
        var i;
        var p = 0;
        var encoded1;
        var encoded2;
        var encoded3;
        var encoded4;
        if (base64[base64.length - 1] === '=') {
            bufferLength--;
            if (base64[base64.length - 2] === '=') {
                bufferLength--;
            }
        }
        var bytes = new Uint8Array(bufferLength);
        for (i = 0; i < len; i += 4) {
            encoded1 = lookup[base64.charCodeAt(i)];
            encoded2 = lookup[base64.charCodeAt(i + 1)];
            encoded3 = lookup[base64.charCodeAt(i + 2)];
            encoded4 = lookup[base64.charCodeAt(i + 3)];
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return bytes;
    };
    // This regex is designed to be as flexible as possible. It will parse certain
    // invalid data URIs.
    var DATA_URI_PREFIX_REGEX = /^(data)?:?([\w\/\+]+)?;?(charset=[\w-]+|base64)?.*,/i;
    /**
     * If the `dataUri` input is a data URI, then the data URI prefix must not be
     * longer than 100 characters, or this function will fail to decode it.
     *
     * @param dataUri a base64 data URI or plain base64 string
     * @returns a Uint8Array containing the decoded input
     */
    var decodeFromBase64DataUri = function (dataUri) {
        var trimmedUri = dataUri.trim();
        var prefix = trimmedUri.substring(0, 100);
        var res = prefix.match(DATA_URI_PREFIX_REGEX);
        // Assume it's not a data URI - just a plain base64 string
        if (!res)
            return decodeFromBase64(trimmedUri);
        // Remove the data URI prefix and parse the remainder as a base64 string
        var fullMatch = res[0];
        var data = trimmedUri.substring(fullMatch.length);
        return decodeFromBase64(data);
    };
    //# sourceMappingURL=base64.js.map

    var toCharCode = function (character) { return character.charCodeAt(0); };
    var toCodePoint = function (character) { return character.codePointAt(0); };
    var toHexStringOfMinLength = function (num, minLength) {
        return padStart(num.toString(16), minLength, '0').toUpperCase();
    };
    var toHexString = function (num) { return toHexStringOfMinLength(num, 2); };
    var charFromCode = function (code) { return String.fromCharCode(code); };
    var charFromHexCode = function (hex) { return charFromCode(parseInt(hex, 16)); };
    var padStart = function (value, length, padChar) {
        var padding = '';
        for (var idx = 0, len = length - value.length; idx < len; idx++) {
            padding += padChar;
        }
        return padding + value;
    };
    var copyStringIntoBuffer = function (str, buffer, offset) {
        var length = str.length;
        for (var idx = 0; idx < length; idx++) {
            buffer[offset++] = str.charCodeAt(idx);
        }
        return length;
    };
    var addRandomSuffix = function (prefix, suffixLength) {
        if (suffixLength === void 0) { suffixLength = 4; }
        return prefix + "-" + Math.floor(Math.random() * Math.pow(10, suffixLength));
    };
    var escapeRegExp = function (str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    var cleanText = function (text) {
        return text.replace(/\t/g, '    ').replace(/[\b\v]/g, '');
    };
    var buildWordBreakRegex = function (wordBreaks) {
        var escapedRules = ['$'];
        for (var idx = 0, len = wordBreaks.length; idx < len; idx++) {
            var wordBreak = wordBreaks[idx];
            if (wordBreak.includes('\n') || wordBreak.includes('\r')) {
                throw new TypeError('`wordBreak` must not include \\n or \\r');
            }
            escapedRules.push(wordBreak === '' ? '.' : escapeRegExp(wordBreak));
        }
        var breakRules = escapedRules.join('|');
        return new RegExp("(\\n|\\r)|((.*?)(" + breakRules + "))", 'gm');
    };
    var breakTextIntoLines = function (text, wordBreaks, maxWidth, computeWidthOfText) {
        var regex = buildWordBreakRegex(wordBreaks);
        var words = cleanText(text).match(regex);
        var currLine = '';
        var currWidth = 0;
        var lines = [];
        var pushCurrLine = function () {
            if (currLine !== '')
                lines.push(currLine);
            currLine = '';
            currWidth = 0;
        };
        for (var idx = 0, len = words.length; idx < len; idx++) {
            var word = words[idx];
            if (word === '\n' || word === '\r') {
                pushCurrLine();
            }
            else {
                var width = computeWidthOfText(word);
                if (currWidth + width > maxWidth)
                    pushCurrLine();
                currLine += word;
                currWidth += width;
            }
        }
        pushCurrLine();
        return lines;
    };
    //# sourceMappingURL=strings.js.map

    var last = function (array) { return array[array.length - 1]; };
    var typedArrayFor = function (value) {
        if (value instanceof Uint8Array)
            return value;
        var length = value.length;
        var typedArray = new Uint8Array(length);
        for (var idx = 0; idx < length; idx++) {
            typedArray[idx] = value.charCodeAt(idx);
        }
        return typedArray;
    };
    var mergeIntoTypedArray = function () {
        var arrays = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            arrays[_i] = arguments[_i];
        }
        var arrayCount = arrays.length;
        var typedArrays = [];
        for (var idx = 0; idx < arrayCount; idx++) {
            var element = arrays[idx];
            typedArrays[idx] =
                element instanceof Uint8Array ? element : typedArrayFor(element);
        }
        var totalSize = 0;
        for (var idx = 0; idx < arrayCount; idx++) {
            totalSize += arrays[idx].length;
        }
        var merged = new Uint8Array(totalSize);
        var offset = 0;
        for (var arrIdx = 0; arrIdx < arrayCount; arrIdx++) {
            var arr = typedArrays[arrIdx];
            for (var byteIdx = 0, arrLen = arr.length; byteIdx < arrLen; byteIdx++) {
                merged[offset++] = arr[byteIdx];
            }
        }
        return merged;
    };
    var mergeUint8Arrays = function (arrays) {
        var totalSize = 0;
        for (var idx = 0, len = arrays.length; idx < len; idx++) {
            totalSize += arrays[idx].length;
        }
        var mergedBuffer = new Uint8Array(totalSize);
        var offset = 0;
        for (var idx = 0, len = arrays.length; idx < len; idx++) {
            var array = arrays[idx];
            mergedBuffer.set(array, offset);
            offset += array.length;
        }
        return mergedBuffer;
    };
    var arrayAsString = function (array) {
        var str = '';
        for (var idx = 0, len = array.length; idx < len; idx++) {
            str += charFromCode(array[idx]);
        }
        return str;
    };
    var byAscendingId = function (a, b) { return a.id - b.id; };
    var sortedUniq = function (array, indexer) {
        var uniq = [];
        for (var idx = 0, len = array.length; idx < len; idx++) {
            var curr = array[idx];
            var prev = array[idx - 1];
            if (idx === 0 || indexer(curr) !== indexer(prev)) {
                uniq.push(curr);
            }
        }
        return uniq;
    };
    // Arrays and TypedArrays in JS both have .reverse() methods, which would seem
    // to negate the need for this function. However, not all runtimes support this
    // method (e.g. React Native). This function compensates for that fact.
    var reverseArray = function (array) {
        var arrayLen = array.length;
        for (var idx = 0, len = Math.floor(arrayLen / 2); idx < len; idx++) {
            var leftIdx = idx;
            var rightIdx = arrayLen - idx - 1;
            var temp = array[idx];
            array[leftIdx] = array[rightIdx];
            array[rightIdx] = temp;
        }
        return array;
    };
    var sum = function (array) {
        var total = 0;
        for (var idx = 0, len = array.length; idx < len; idx++) {
            total += array[idx];
        }
        return total;
    };
    var range = function (start, end) {
        var arr = new Array(end - start);
        for (var idx = start; idx < end; idx++)
            arr[idx] = idx;
        return arr;
    };
    var pluckIndices = function (arr, indices) {
        var plucked = new Array(indices.length);
        for (var idx = 0, len = indices.length; idx < len; idx++) {
            plucked[idx] = arr[indices[idx]];
        }
        return plucked;
    };
    var canBeConvertedToUint8Array = function (input) {
        return input instanceof Uint8Array ||
            input instanceof ArrayBuffer ||
            typeof input === 'string';
    };
    var toUint8Array = function (input) {
        if (typeof input === 'string') {
            return decodeFromBase64DataUri(input);
        }
        else if (input instanceof ArrayBuffer) {
            return new Uint8Array(input);
        }
        else if (input instanceof Uint8Array) {
            return input;
        }
        else {
            throw new TypeError('`input` must be one of `string | ArrayBuffer | Uint8Array`');
        }
    };
    //# sourceMappingURL=arrays.js.map

    /**
     * Returns a Promise that resolves after at least one tick of the
     * Macro Task Queue occurs.
     */
    var waitForTick = function () {
        return new Promise(function (resolve) {
            setTimeout(function () { return resolve(); }, 0);
        });
    };
    //# sourceMappingURL=async.js.map

    /**
     * Encodes a string to UTF-16.
     *
     * @param input The string to be encoded.
     * @param byteOrderMark Whether or not a byte order marker (BOM) should be added
     *                      to the start of the encoding. (default `true`)
     * @returns A Uint16Array containing the UTF-16 encoding of the input string.
     *
     * -----------------------------------------------------------------------------
     *
     * JavaScript strings are composed of Unicode code points. Code points are
     * integers in the range 0 to 1,114,111 (0x10FFFF). When serializing a string,
     * it must be encoded as a sequence of words. A word is typically 8, 16, or 32
     * bytes in size. As such, Unicode defines three encoding forms: UTF-8, UTF-16,
     * and UTF-32. These encoding forms are described in the Unicode standard [1].
     * This function implements the UTF-16 encoding form.
     *
     * -----------------------------------------------------------------------------
     *
     * In UTF-16, each code point is mapped to one or two 16-bit integers. The
     * UTF-16 mapping logic is as follows [2]:
     *
     * • If a code point is in the range U+0000..U+FFFF, then map the code point to
     *   a 16-bit integer with the most significant byte first.
     *
     * • If a code point is in the range U+10000..U+10000, then map the code point
     *   to two 16-bit integers. The first integer should contain the high surrogate
     *   and the second integer should contain the low surrogate. Both surrogates
     *   should be written with the most significant byte first.
     *
     * -----------------------------------------------------------------------------
     *
     * It is important to note, when iterating through the code points of a string
     * in JavaScript, that if a character is encoded as a surrogate pair it will
     * increase the string's length by 2 instead of 1 [4]. For example:
     *
     * ```
     * > 'a'.length
     * 1
     * > '💩'.length
     * 2
     * > '語'.length
     * 1
     * > 'a💩語'.length
     * 4
     * ```
     *
     * The results of the above example are explained by the fact that the
     * characters 'a' and '語' are not represented by surrogate pairs, but '💩' is.
     *
     * Because of this idiosyncrasy in JavaScript's string implementation and APIs,
     * we must "jump" an extra index after encoding a character as a surrogate
     * pair. In practice, this means we must increment the index of our for loop by
     * 2 if we encode a surrogate pair, and 1 in all other cases.
     *
     * -----------------------------------------------------------------------------
     *
     * References:
     *   - [1] https://www.unicode.org/versions/Unicode12.0.0/UnicodeStandard-12.0.pdf
     *         3.9  Unicode Encoding Forms - UTF-8
     *   - [2] http://www.herongyang.com/Unicode/UTF-16-UTF-16-Encoding.html
     *   - [3] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length#Description
     *
     */
    var utf16Encode = function (input, byteOrderMark) {
        if (byteOrderMark === void 0) { byteOrderMark = true; }
        var encoded = [];
        if (byteOrderMark)
            encoded.push(0xfeff);
        for (var idx = 0, len = input.length; idx < len;) {
            var codePoint = input.codePointAt(idx);
            // Two byte encoding
            if (codePoint < 0x010000) {
                encoded.push(codePoint);
                idx += 1;
            }
            // Four byte encoding (surrogate pair)
            else if (codePoint < 0x110000) {
                encoded.push(highSurrogate(codePoint), lowSurrogate(codePoint));
                idx += 2;
            }
            // Should never reach this case
            else
                throw new Error("Invalid code point: 0x" + toHexString(codePoint));
        }
        return new Uint16Array(encoded);
    };
    /**
     * Returns `true` if the `codePoint` is within the
     * Basic Multilingual Plane (BMP). Code points inside the BMP are not encoded
     * with surrogate pairs.
     * @param codePoint The code point to be evaluated.
     *
     * Reference: https://en.wikipedia.org/wiki/UTF-16#Description
     */
    var isWithinBMP = function (codePoint) {
        return codePoint >= 0 && codePoint <= 0xffff;
    };
    /**
     * Returns `true` if the given `codePoint` is valid and must be represented
     * with a surrogate pair when encoded.
     * @param codePoint The code point to be evaluated.
     *
     * Reference: https://en.wikipedia.org/wiki/UTF-16#Description
     */
    var hasSurrogates = function (codePoint) {
        return codePoint >= 0x010000 && codePoint <= 0x10ffff;
    };
    // From Unicode 3.0 spec, section 3.7:
    //   http://unicode.org/versions/Unicode3.0.0/ch03.pdf
    var highSurrogate = function (codePoint) {
        return Math.floor((codePoint - 0x10000) / 0x400) + 0xd800;
    };
    // From Unicode 3.0 spec, section 3.7:
    //   http://unicode.org/versions/Unicode3.0.0/ch03.pdf
    var lowSurrogate = function (codePoint) {
        return ((codePoint - 0x10000) % 0x400) + 0xdc00;
    };
    //# sourceMappingURL=unicode.js.map

    // tslint:disable radix
    /**
     * Converts a number to its string representation in decimal. This function
     * differs from simply converting a number to a string with `.toString()`
     * because this function's output string will **not** contain exponential
     * notation.
     *
     * Credit: https://stackoverflow.com/a/46545519
     */
    var numberToString = function (num) {
        var numStr = String(num);
        if (Math.abs(num) < 1.0) {
            var e = parseInt(num.toString().split('e-')[1]);
            if (e) {
                var negative = num < 0;
                if (negative)
                    num *= -1;
                num *= Math.pow(10, e - 1);
                numStr = '0.' + new Array(e).join('0') + num.toString().substring(2);
                if (negative)
                    numStr = '-' + numStr;
            }
        }
        else {
            var e = parseInt(num.toString().split('+')[1]);
            if (e > 20) {
                e -= 20;
                num /= Math.pow(10, e);
                numStr = num.toString() + new Array(e + 1).join('0');
            }
        }
        return numStr;
    };
    var sizeInBytes = function (n) { return Math.ceil(n.toString(2).length / 8); };
    /**
     * Converts a number into its constituent bytes and returns them as
     * a number[].
     *
     * Returns most significant byte as first element in array. It may be necessary
     * to call .reverse() to get the bits in the desired order.
     *
     * Example:
     *   bytesFor(0x02A41E) => [ 0b10, 0b10100100, 0b11110 ]
     *
     * Credit for algorithm: https://stackoverflow.com/a/1936865
     */
    var bytesFor = function (n) {
        var bytes = new Uint8Array(sizeInBytes(n));
        for (var i = 1; i <= bytes.length; i++) {
            bytes[i - 1] = n >> ((bytes.length - i) * 8);
        }
        return bytes;
    };
    //# sourceMappingURL=numbers.js.map

    var error = function (msg) {
        throw new Error(msg);
    };
    //# sourceMappingURL=errors.js.map

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var base64Arraybuffer = createCommonjsModule(function (module, exports) {
    /*
     * base64-arraybuffer
     * https://github.com/niklasvh/base64-arraybuffer
     *
     * Copyright (c) 2012 Niklas von Hertzen
     * Licensed under the MIT license.
     */
    (function(){

      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

      // Use a lookup table to find the index.
      var lookup = new Uint8Array(256);
      for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
      }

      exports.encode = function(arraybuffer) {
        var bytes = new Uint8Array(arraybuffer),
        i, len = bytes.length, base64 = "";

        for (i = 0; i < len; i+=3) {
          base64 += chars[bytes[i] >> 2];
          base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
          base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
          base64 += chars[bytes[i + 2] & 63];
        }

        if ((len % 3) === 2) {
          base64 = base64.substring(0, base64.length - 1) + "=";
        } else if (len % 3 === 1) {
          base64 = base64.substring(0, base64.length - 2) + "==";
        }

        return base64;
      };

      exports.decode =  function(base64) {
        var bufferLength = base64.length * 0.75,
        len = base64.length, i, p = 0,
        encoded1, encoded2, encoded3, encoded4;

        if (base64[base64.length - 1] === "=") {
          bufferLength--;
          if (base64[base64.length - 2] === "=") {
            bufferLength--;
          }
        }

        var arraybuffer = new ArrayBuffer(bufferLength),
        bytes = new Uint8Array(arraybuffer);

        for (i = 0; i < len; i+=4) {
          encoded1 = lookup[base64.charCodeAt(i)];
          encoded2 = lookup[base64.charCodeAt(i+1)];
          encoded3 = lookup[base64.charCodeAt(i+2)];
          encoded4 = lookup[base64.charCodeAt(i+3)];

          bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
          bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
          bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        return arraybuffer;
      };
    })();
    });
    var base64Arraybuffer_1 = base64Arraybuffer.encode;
    var base64Arraybuffer_2 = base64Arraybuffer.decode;

    var common = createCommonjsModule(function (module, exports) {


    var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                    (typeof Uint16Array !== 'undefined') &&
                    (typeof Int32Array !== 'undefined');

    function _has(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }

    exports.assign = function (obj /*from1, from2, from3, ...*/) {
      var sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        var source = sources.shift();
        if (!source) { continue; }

        if (typeof source !== 'object') {
          throw new TypeError(source + 'must be non-object');
        }

        for (var p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }

      return obj;
    };


    // reduce buffer size, avoiding mem copy
    exports.shrinkBuf = function (buf, size) {
      if (buf.length === size) { return buf; }
      if (buf.subarray) { return buf.subarray(0, size); }
      buf.length = size;
      return buf;
    };


    var fnTyped = {
      arraySet: function (dest, src, src_offs, len, dest_offs) {
        if (src.subarray && dest.subarray) {
          dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
          return;
        }
        // Fallback to ordinary array
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      // Join array of chunks to single array.
      flattenChunks: function (chunks) {
        var i, l, len, pos, chunk, result;

        // calculate data length
        len = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          len += chunks[i].length;
        }

        // join chunks
        result = new Uint8Array(len);
        pos = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          chunk = chunks[i];
          result.set(chunk, pos);
          pos += chunk.length;
        }

        return result;
      }
    };

    var fnUntyped = {
      arraySet: function (dest, src, src_offs, len, dest_offs) {
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      // Join array of chunks to single array.
      flattenChunks: function (chunks) {
        return [].concat.apply([], chunks);
      }
    };


    // Enable/Disable typed arrays use, for testing
    //
    exports.setTyped = function (on) {
      if (on) {
        exports.Buf8  = Uint8Array;
        exports.Buf16 = Uint16Array;
        exports.Buf32 = Int32Array;
        exports.assign(exports, fnTyped);
      } else {
        exports.Buf8  = Array;
        exports.Buf16 = Array;
        exports.Buf32 = Array;
        exports.assign(exports, fnUntyped);
      }
    };

    exports.setTyped(TYPED_OK);
    });
    var common_1 = common.assign;
    var common_2 = common.shrinkBuf;
    var common_3 = common.setTyped;
    var common_4 = common.Buf8;
    var common_5 = common.Buf16;
    var common_6 = common.Buf32;

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    /* eslint-disable space-unary-ops */



    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    //var Z_FILTERED          = 1;
    //var Z_HUFFMAN_ONLY      = 2;
    //var Z_RLE               = 3;
    var Z_FIXED               = 4;
    //var Z_DEFAULT_STRATEGY  = 0;

    /* Possible values of the data_type field (though see inflate()) */
    var Z_BINARY              = 0;
    var Z_TEXT                = 1;
    //var Z_ASCII             = 1; // = Z_TEXT
    var Z_UNKNOWN             = 2;

    /*============================================================================*/


    function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

    // From zutil.h

    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES    = 2;
    /* The three kinds of block type */

    var MIN_MATCH    = 3;
    var MAX_MATCH    = 258;
    /* The minimum and maximum match lengths */

    // From deflate.h
    /* ===========================================================================
     * Internal compression state.
     */

    var LENGTH_CODES  = 29;
    /* number of length codes, not counting the special END_BLOCK code */

    var LITERALS      = 256;
    /* number of literal bytes 0..255 */

    var L_CODES       = LITERALS + 1 + LENGTH_CODES;
    /* number of Literal or Length codes, including the END_BLOCK code */

    var D_CODES       = 30;
    /* number of distance codes */

    var BL_CODES      = 19;
    /* number of codes used to transfer the bit lengths */

    var HEAP_SIZE     = 2 * L_CODES + 1;
    /* maximum heap size */

    var MAX_BITS      = 15;
    /* All codes must not exceed MAX_BITS bits */

    var Buf_size      = 16;
    /* size of bit buffer in bi_buf */


    /* ===========================================================================
     * Constants
     */

    var MAX_BL_BITS = 7;
    /* Bit length codes must not exceed MAX_BL_BITS bits */

    var END_BLOCK   = 256;
    /* end of block literal code */

    var REP_3_6     = 16;
    /* repeat previous bit length 3-6 times (2 bits of repeat count) */

    var REPZ_3_10   = 17;
    /* repeat a zero length 3-10 times  (3 bits of repeat count) */

    var REPZ_11_138 = 18;
    /* repeat a zero length 11-138 times  (7 bits of repeat count) */

    /* eslint-disable comma-spacing,array-bracket-spacing */
    var extra_lbits =   /* extra bits for each length code */
      [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

    var extra_dbits =   /* extra bits for each distance code */
      [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

    var extra_blbits =  /* extra bits for each bit length code */
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

    var bl_order =
      [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
    /* eslint-enable comma-spacing,array-bracket-spacing */

    /* The lengths of the bit length codes are sent in order of decreasing
     * probability, to avoid transmitting the lengths for unused bit length codes.
     */

    /* ===========================================================================
     * Local data. These are initialized only once.
     */

    // We pre-fill arrays with 0 to avoid uninitialized gaps

    var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

    // !!!! Use flat array instead of structure, Freq = i*2, Len = i*2+1
    var static_ltree  = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    /* The static literal tree. Since the bit lengths are imposed, there is no
     * need for the L_CODES extra codes used during heap construction. However
     * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
     * below).
     */

    var static_dtree  = new Array(D_CODES * 2);
    zero(static_dtree);
    /* The static distance tree. (Actually a trivial tree since all codes use
     * 5 bits.)
     */

    var _dist_code    = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    /* Distance codes. The first 256 values correspond to the distances
     * 3 .. 258, the last 256 values correspond to the top 8 bits of
     * the 15 bit distances.
     */

    var _length_code  = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    /* length code for each normalized match length (0 == MIN_MATCH) */

    var base_length   = new Array(LENGTH_CODES);
    zero(base_length);
    /* First normalized length for each code (0 = MIN_MATCH) */

    var base_dist     = new Array(D_CODES);
    zero(base_dist);
    /* First normalized distance for each code (0 = distance of 1) */


    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {

      this.static_tree  = static_tree;  /* static tree or NULL */
      this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
      this.extra_base   = extra_base;   /* base index for extra_bits */
      this.elems        = elems;        /* max number of elements in the tree */
      this.max_length   = max_length;   /* max bit length for the codes */

      // show if `static_tree` has data or dummy - needed for monomorphic objects
      this.has_stree    = static_tree && static_tree.length;
    }


    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;


    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;     /* the dynamic tree */
      this.max_code = 0;            /* largest code with non zero frequency */
      this.stat_desc = stat_desc;   /* the corresponding static tree */
    }



    function d_code(dist) {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    }


    /* ===========================================================================
     * Output a short LSB first on the stream.
     * IN assertion: there is enough room in pendingBuf.
     */
    function put_short(s, w) {
    //    put_byte(s, (uch)((w) & 0xff));
    //    put_byte(s, (uch)((ush)(w) >> 8));
      s.pending_buf[s.pending++] = (w) & 0xff;
      s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
    }


    /* ===========================================================================
     * Send a value on a given number of bits.
     * IN assertion: length <= 16 and value fits in length bits.
     */
    function send_bits(s, value, length) {
      if (s.bi_valid > (Buf_size - length)) {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> (Buf_size - s.bi_valid);
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        s.bi_valid += length;
      }
    }


    function send_code(s, c, tree) {
      send_bits(s, tree[c * 2]/*.Code*/, tree[c * 2 + 1]/*.Len*/);
    }


    /* ===========================================================================
     * Reverse the first len bits of a code, using straightforward code (a faster
     * method would use a table)
     * IN assertion: 1 <= len <= 15
     */
    function bi_reverse(code, len) {
      var res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    }


    /* ===========================================================================
     * Flush the bit buffer, keeping at most 7 bits in it.
     */
    function bi_flush(s) {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;

      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 0xff;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    }


    /* ===========================================================================
     * Compute the optimal bit lengths for a tree and update the total bit length
     * for the current block.
     * IN assertion: the fields freq and dad are set, heap[heap_max] and
     *    above are the tree nodes sorted by increasing frequency.
     * OUT assertions: the field len is set to the optimal bit length, the
     *     array bl_count contains the frequencies for each bit length.
     *     The length opt_len is updated; static_len is also updated if stree is
     *     not null.
     */
    function gen_bitlen(s, desc)
    //    deflate_state *s;
    //    tree_desc *desc;    /* the tree descriptor */
    {
      var tree            = desc.dyn_tree;
      var max_code        = desc.max_code;
      var stree           = desc.stat_desc.static_tree;
      var has_stree       = desc.stat_desc.has_stree;
      var extra           = desc.stat_desc.extra_bits;
      var base            = desc.stat_desc.extra_base;
      var max_length      = desc.stat_desc.max_length;
      var h;              /* heap index */
      var n, m;           /* iterate over the tree elements */
      var bits;           /* bit length */
      var xbits;          /* extra bits */
      var f;              /* frequency */
      var overflow = 0;   /* number of elements with bit length too large */

      for (bits = 0; bits <= MAX_BITS; bits++) {
        s.bl_count[bits] = 0;
      }

      /* In a first pass, compute the optimal bit lengths (which may
       * overflow in the case of the bit length tree).
       */
      tree[s.heap[s.heap_max] * 2 + 1]/*.Len*/ = 0; /* root of the heap */

      for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n * 2 + 1]/*.Len*/ = bits;
        /* We overwrite tree[n].Dad which is no longer needed */

        if (n > max_code) { continue; } /* not a leaf node */

        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2]/*.Freq*/;
        s.opt_len += f * (bits + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1]/*.Len*/ + xbits);
        }
      }
      if (overflow === 0) { return; }

      // Trace((stderr,"\nbit length overflow\n"));
      /* This happens for example on obj2 and pic of the Calgary corpus */

      /* Find the first bit length which could increase: */
      do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) { bits--; }
        s.bl_count[bits]--;      /* move one leaf down the tree */
        s.bl_count[bits + 1] += 2; /* move one overflow item as its brother */
        s.bl_count[max_length]--;
        /* The brother of the overflow item also moves one step up,
         * but this does not affect bl_count[max_length]
         */
        overflow -= 2;
      } while (overflow > 0);

      /* Now recompute all bit lengths, scanning in increasing frequency.
       * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
       * lengths instead of fixing only the wrong ones. This idea is taken
       * from 'ar' written by Haruhiko Okumura.)
       */
      for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) { continue; }
          if (tree[m * 2 + 1]/*.Len*/ !== bits) {
            // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
            s.opt_len += (bits - tree[m * 2 + 1]/*.Len*/) * tree[m * 2]/*.Freq*/;
            tree[m * 2 + 1]/*.Len*/ = bits;
          }
          n--;
        }
      }
    }


    /* ===========================================================================
     * Generate the codes for a given tree and bit counts (which need not be
     * optimal).
     * IN assertion: the array bl_count contains the bit length statistics for
     * the given tree and the field len is set for all tree elements.
     * OUT assertion: the field code is set for all tree elements of non
     *     zero code length.
     */
    function gen_codes(tree, max_code, bl_count)
    //    ct_data *tree;             /* the tree to decorate */
    //    int max_code;              /* largest code with non zero frequency */
    //    ushf *bl_count;            /* number of codes at each bit length */
    {
      var next_code = new Array(MAX_BITS + 1); /* next code value for each bit length */
      var code = 0;              /* running code value */
      var bits;                  /* bit index */
      var n;                     /* code index */

      /* The distribution counts are first used to generate the code values
       * without bit reversal.
       */
      for (bits = 1; bits <= MAX_BITS; bits++) {
        next_code[bits] = code = (code + bl_count[bits - 1]) << 1;
      }
      /* Check that the bit counts in bl_count are consistent. The last code
       * must be all ones.
       */
      //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
      //        "inconsistent bit counts");
      //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

      for (n = 0;  n <= max_code; n++) {
        var len = tree[n * 2 + 1]/*.Len*/;
        if (len === 0) { continue; }
        /* Now reverse the bits */
        tree[n * 2]/*.Code*/ = bi_reverse(next_code[len]++, len);

        //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
        //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
      }
    }


    /* ===========================================================================
     * Initialize the various 'constant' tables.
     */
    function tr_static_init() {
      var n;        /* iterates over tree elements */
      var bits;     /* bit counter */
      var length;   /* length value */
      var code;     /* code value */
      var dist;     /* distance index */
      var bl_count = new Array(MAX_BITS + 1);
      /* number of codes at each bit length for an optimal tree */

      // do check in _tr_init()
      //if (static_init_done) return;

      /* For some embedded targets, global variables are not initialized: */
    /*#ifdef NO_INIT_GLOBAL_POINTERS
      static_l_desc.static_tree = static_ltree;
      static_l_desc.extra_bits = extra_lbits;
      static_d_desc.static_tree = static_dtree;
      static_d_desc.extra_bits = extra_dbits;
      static_bl_desc.extra_bits = extra_blbits;
    #endif*/

      /* Initialize the mapping length (0..255) -> length code (0..28) */
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < (1 << extra_lbits[code]); n++) {
          _length_code[length++] = code;
        }
      }
      //Assert (length == 256, "tr_static_init: length != 256");
      /* Note that the length 255 (match length 258) can be represented
       * in two different ways: code 284 + 5 bits or code 285, so we
       * overwrite length_code[255] to use the best encoding:
       */
      _length_code[length - 1] = code;

      /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < (1 << extra_dbits[code]); n++) {
          _dist_code[dist++] = code;
        }
      }
      //Assert (dist == 256, "tr_static_init: dist != 256");
      dist >>= 7; /* from now on, all distances are divided by 128 */
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      //Assert (dist == 256, "tr_static_init: 256+dist != 512");

      /* Construct the codes of the static literal tree */
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }

      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1]/*.Len*/ = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1]/*.Len*/ = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1]/*.Len*/ = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1]/*.Len*/ = 8;
        n++;
        bl_count[8]++;
      }
      /* Codes 286 and 287 do not exist, but we must include them in the
       * tree construction to get a canonical Huffman tree (longest code
       * all ones)
       */
      gen_codes(static_ltree, L_CODES + 1, bl_count);

      /* The static distance tree is trivial: */
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1]/*.Len*/ = 5;
        static_dtree[n * 2]/*.Code*/ = bi_reverse(n, 5);
      }

      // Now data ready and we can init static trees
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS);

      //static_init_done = true;
    }


    /* ===========================================================================
     * Initialize a new block.
     */
    function init_block(s) {
      var n; /* iterates over tree elements */

      /* Initialize the trees. */
      for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n * 2]/*.Freq*/ = 0; }
      for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n * 2]/*.Freq*/ = 0; }
      for (n = 0; n < BL_CODES; n++) { s.bl_tree[n * 2]/*.Freq*/ = 0; }

      s.dyn_ltree[END_BLOCK * 2]/*.Freq*/ = 1;
      s.opt_len = s.static_len = 0;
      s.last_lit = s.matches = 0;
    }


    /* ===========================================================================
     * Flush the bit buffer and align the output on a byte boundary
     */
    function bi_windup(s)
    {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        //put_byte(s, (Byte)s->bi_buf);
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    }

    /* ===========================================================================
     * Copy a stored block, storing first the length and its
     * one's complement if requested.
     */
    function copy_block(s, buf, len, header)
    //DeflateState *s;
    //charf    *buf;    /* the input data */
    //unsigned len;     /* its length */
    //int      header;  /* true if block header must be written */
    {
      bi_windup(s);        /* align on byte boundary */

      if (header) {
        put_short(s, len);
        put_short(s, ~len);
      }
    //  while (len--) {
    //    put_byte(s, *buf++);
    //  }
      common.arraySet(s.pending_buf, s.window, buf, len, s.pending);
      s.pending += len;
    }

    /* ===========================================================================
     * Compares to subtrees, using the tree depth as tie breaker when
     * the subtrees have equal frequency. This minimizes the worst case length.
     */
    function smaller(tree, n, m, depth) {
      var _n2 = n * 2;
      var _m2 = m * 2;
      return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
             (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
    }

    /* ===========================================================================
     * Restore the heap property by moving down the tree starting at node k,
     * exchanging a node with the smallest of its two sons if necessary, stopping
     * when the heap property is re-established (each father smaller than its
     * two sons).
     */
    function pqdownheap(s, tree, k)
    //    deflate_state *s;
    //    ct_data *tree;  /* the tree to restore */
    //    int k;               /* node to move down */
    {
      var v = s.heap[k];
      var j = k << 1;  /* left son of k */
      while (j <= s.heap_len) {
        /* Set j to the smallest of the two sons: */
        if (j < s.heap_len &&
          smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        /* Exit if v is smaller than both sons */
        if (smaller(tree, v, s.heap[j], s.depth)) { break; }

        /* Exchange v with the smallest son */
        s.heap[k] = s.heap[j];
        k = j;

        /* And continue down the tree, setting j to the left son of k */
        j <<= 1;
      }
      s.heap[k] = v;
    }


    // inlined manually
    // var SMALLEST = 1;

    /* ===========================================================================
     * Send the block data compressed using the given Huffman trees
     */
    function compress_block(s, ltree, dtree)
    //    deflate_state *s;
    //    const ct_data *ltree; /* literal tree */
    //    const ct_data *dtree; /* distance tree */
    {
      var dist;           /* distance of matched string */
      var lc;             /* match length or unmatched char (if dist == 0) */
      var lx = 0;         /* running index in l_buf */
      var code;           /* the code to send */
      var extra;          /* number of extra bits to send */

      if (s.last_lit !== 0) {
        do {
          dist = (s.pending_buf[s.d_buf + lx * 2] << 8) | (s.pending_buf[s.d_buf + lx * 2 + 1]);
          lc = s.pending_buf[s.l_buf + lx];
          lx++;

          if (dist === 0) {
            send_code(s, lc, ltree); /* send a literal byte */
            //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
          } else {
            /* Here, lc is the match length - MIN_MATCH */
            code = _length_code[lc];
            send_code(s, code + LITERALS + 1, ltree); /* send the length code */
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra);       /* send the extra length bits */
            }
            dist--; /* dist is now the match distance - 1 */
            code = d_code(dist);
            //Assert (code < D_CODES, "bad d_code");

            send_code(s, code, dtree);       /* send the distance code */
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);   /* send the extra distance bits */
            }
          } /* literal or match pair ? */

          /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
          //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
          //       "pendingBuf overflow");

        } while (lx < s.last_lit);
      }

      send_code(s, END_BLOCK, ltree);
    }


    /* ===========================================================================
     * Construct one Huffman tree and assigns the code bit strings and lengths.
     * Update the total bit length for the current block.
     * IN assertion: the field freq is set for all tree elements.
     * OUT assertions: the fields len and code are set to the optimal bit length
     *     and corresponding code. The length opt_len is updated; static_len is
     *     also updated if stree is not null. The field max_code is set.
     */
    function build_tree(s, desc)
    //    deflate_state *s;
    //    tree_desc *desc; /* the tree descriptor */
    {
      var tree     = desc.dyn_tree;
      var stree    = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var elems    = desc.stat_desc.elems;
      var n, m;          /* iterate over heap elements */
      var max_code = -1; /* largest code with non zero frequency */
      var node;          /* new node being created */

      /* Construct the initial heap, with least frequent element in
       * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
       * heap[0] is not used.
       */
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE;

      for (n = 0; n < elems; n++) {
        if (tree[n * 2]/*.Freq*/ !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;

        } else {
          tree[n * 2 + 1]/*.Len*/ = 0;
        }
      }

      /* The pkzip format requires that at least one distance code exists,
       * and that at least one bit should be sent even if there is only one
       * possible code. So to avoid special checks later on we force at least
       * two codes of non zero frequency.
       */
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
        tree[node * 2]/*.Freq*/ = 1;
        s.depth[node] = 0;
        s.opt_len--;

        if (has_stree) {
          s.static_len -= stree[node * 2 + 1]/*.Len*/;
        }
        /* node is 0 or 1 so it does not have extra bits */
      }
      desc.max_code = max_code;

      /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
       * establish sub-heaps of increasing lengths:
       */
      for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

      /* Construct the Huffman tree by repeatedly combining the least two
       * frequent nodes.
       */
      node = elems;              /* next internal node of the tree */
      do {
        //pqremove(s, tree, n);  /* n = node of least frequency */
        /*** pqremove ***/
        n = s.heap[1/*SMALLEST*/];
        s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1/*SMALLEST*/);
        /***/

        m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

        s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
        s.heap[--s.heap_max] = m;

        /* Create a new node father of n and m */
        tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1]/*.Dad*/ = tree[m * 2 + 1]/*.Dad*/ = node;

        /* and insert the new node in the heap */
        s.heap[1/*SMALLEST*/] = node++;
        pqdownheap(s, tree, 1/*SMALLEST*/);

      } while (s.heap_len >= 2);

      s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

      /* At this point, the fields freq and dad are set. We can now
       * generate the bit lengths.
       */
      gen_bitlen(s, desc);

      /* The field len is now set, we can generate the bit codes */
      gen_codes(tree, max_code, s.bl_count);
    }


    /* ===========================================================================
     * Scan a literal or distance tree to determine the frequencies of the codes
     * in the bit length tree.
     */
    function scan_tree(s, tree, max_code)
    //    deflate_state *s;
    //    ct_data *tree;   /* the tree to be scanned */
    //    int max_code;    /* and its largest code of non zero frequency */
    {
      var n;                     /* iterates over all tree elements */
      var prevlen = -1;          /* last emitted length */
      var curlen;                /* length of current code */

      var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

      var count = 0;             /* repeat count of the current code */
      var max_count = 7;         /* max repeat count */
      var min_count = 4;         /* min repeat count */

      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1]/*.Len*/ = 0xffff; /* guard */

      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

        if (++count < max_count && curlen === nextlen) {
          continue;

        } else if (count < min_count) {
          s.bl_tree[curlen * 2]/*.Freq*/ += count;

        } else if (curlen !== 0) {

          if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
          s.bl_tree[REP_3_6 * 2]/*.Freq*/++;

        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2]/*.Freq*/++;

        } else {
          s.bl_tree[REPZ_11_138 * 2]/*.Freq*/++;
        }

        count = 0;
        prevlen = curlen;

        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;

        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;

        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }


    /* ===========================================================================
     * Send a literal or distance tree in compressed form, using the codes in
     * bl_tree.
     */
    function send_tree(s, tree, max_code)
    //    deflate_state *s;
    //    ct_data *tree; /* the tree to be scanned */
    //    int max_code;       /* and its largest code of non zero frequency */
    {
      var n;                     /* iterates over all tree elements */
      var prevlen = -1;          /* last emitted length */
      var curlen;                /* length of current code */

      var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

      var count = 0;             /* repeat count of the current code */
      var max_count = 7;         /* max repeat count */
      var min_count = 4;         /* min repeat count */

      /* tree[max_code+1].Len = -1; */  /* guard already set */
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }

      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

        if (++count < max_count && curlen === nextlen) {
          continue;

        } else if (count < min_count) {
          do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          //Assert(count >= 3 && count <= 6, " 3_6?");
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);

        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);

        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }

        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;

        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;

        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }


    /* ===========================================================================
     * Construct the Huffman tree for the bit lengths and return the index in
     * bl_order of the last bit length code to send.
     */
    function build_bl_tree(s) {
      var max_blindex;  /* index of last bit length code of non zero freq */

      /* Determine the bit length frequencies for literal and distance trees */
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

      /* Build the bit length tree: */
      build_tree(s, s.bl_desc);
      /* opt_len now includes the length of the tree representations, except
       * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
       */

      /* Determine the number of bit length codes to send. The pkzip format
       * requires that at least 4 bit length codes be sent. (appnote.txt says
       * 3 but the actual value used is 4.)
       */
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1]/*.Len*/ !== 0) {
          break;
        }
      }
      /* Update opt_len to include the bit length tree and counts */
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
      //        s->opt_len, s->static_len));

      return max_blindex;
    }


    /* ===========================================================================
     * Send the header for a block using dynamic Huffman trees: the counts, the
     * lengths of the bit length codes, the literal tree and the distance tree.
     * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
     */
    function send_all_trees(s, lcodes, dcodes, blcodes)
    //    deflate_state *s;
    //    int lcodes, dcodes, blcodes; /* number of codes for each tree */
    {
      var rank;                    /* index in bl_order */

      //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
      //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
      //        "too many codes");
      //Tracev((stderr, "\nbl counts: "));
      send_bits(s, lcodes - 257, 5); /* not +255 as stated in appnote.txt */
      send_bits(s, dcodes - 1,   5);
      send_bits(s, blcodes - 4,  4); /* not -3 as stated in appnote.txt */
      for (rank = 0; rank < blcodes; rank++) {
        //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1]/*.Len*/, 3);
      }
      //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

      send_tree(s, s.dyn_ltree, lcodes - 1); /* literal tree */
      //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

      send_tree(s, s.dyn_dtree, dcodes - 1); /* distance tree */
      //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
    }


    /* ===========================================================================
     * Check if the data type is TEXT or BINARY, using the following algorithm:
     * - TEXT if the two conditions below are satisfied:
     *    a) There are no non-portable control characters belonging to the
     *       "black list" (0..6, 14..25, 28..31).
     *    b) There is at least one printable character belonging to the
     *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
     * - BINARY otherwise.
     * - The following partially-portable control characters form a
     *   "gray list" that is ignored in this detection algorithm:
     *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
     * IN assertion: the fields Freq of dyn_ltree are set.
     */
    function detect_data_type(s) {
      /* black_mask is the bit mask of black-listed bytes
       * set bits 0..6, 14..25, and 28..31
       * 0xf3ffc07f = binary 11110011111111111100000001111111
       */
      var black_mask = 0xf3ffc07f;
      var n;

      /* Check for non-textual ("black-listed") bytes. */
      for (n = 0; n <= 31; n++, black_mask >>>= 1) {
        if ((black_mask & 1) && (s.dyn_ltree[n * 2]/*.Freq*/ !== 0)) {
          return Z_BINARY;
        }
      }

      /* Check for textual ("white-listed") bytes. */
      if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
          s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
        return Z_TEXT;
      }
      for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
          return Z_TEXT;
        }
      }

      /* There are no "black-listed" or "white-listed" bytes:
       * this stream either is empty or has tolerated ("gray-listed") bytes only.
       */
      return Z_BINARY;
    }


    var static_init_done = false;

    /* ===========================================================================
     * Initialize the tree data structures for a new zlib stream.
     */
    function _tr_init(s)
    {

      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }

      s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

      s.bi_buf = 0;
      s.bi_valid = 0;

      /* Initialize the first block of the first file: */
      init_block(s);
    }


    /* ===========================================================================
     * Send a stored block
     */
    function _tr_stored_block(s, buf, stored_len, last)
    //DeflateState *s;
    //charf *buf;       /* input block */
    //ulg stored_len;   /* length of input block */
    //int last;         /* one if this is the last block for a file */
    {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);    /* send block type */
      copy_block(s, buf, stored_len, true); /* with header */
    }


    /* ===========================================================================
     * Send one empty static block to give enough lookahead for inflate.
     * This takes 10 bits, of which 7 may remain in the bit buffer.
     */
    function _tr_align(s) {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    }


    /* ===========================================================================
     * Determine the best encoding for the current block: dynamic trees, static
     * trees or store, and output the encoded block to the zip file.
     */
    function _tr_flush_block(s, buf, stored_len, last)
    //DeflateState *s;
    //charf *buf;       /* input block, or NULL if too old */
    //ulg stored_len;   /* length of input block */
    //int last;         /* one if this is the last block for a file */
    {
      var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
      var max_blindex = 0;        /* index of last bit length code of non zero freq */

      /* Build the Huffman trees unless a stored block is forced */
      if (s.level > 0) {

        /* Check if the file is binary or text */
        if (s.strm.data_type === Z_UNKNOWN) {
          s.strm.data_type = detect_data_type(s);
        }

        /* Construct the literal and distance trees */
        build_tree(s, s.l_desc);
        // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
        //        s->static_len));

        build_tree(s, s.d_desc);
        // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
        //        s->static_len));
        /* At this point, opt_len and static_len are the total bit lengths of
         * the compressed block data, excluding the tree representations.
         */

        /* Build the bit length tree for the above two trees, and get the index
         * in bl_order of the last bit length code to send.
         */
        max_blindex = build_bl_tree(s);

        /* Determine the best encoding. Compute the block lengths in bytes. */
        opt_lenb = (s.opt_len + 3 + 7) >>> 3;
        static_lenb = (s.static_len + 3 + 7) >>> 3;

        // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
        //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
        //        s->last_lit));

        if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

      } else {
        // Assert(buf != (char*)0, "lost buf");
        opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
      }

      if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
        /* 4: two words for the lengths */

        /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
         * Otherwise we can't have processed more than WSIZE input bytes since
         * the last block flush, because compression would have been
         * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
         * transform a block into a stored block.
         */
        _tr_stored_block(s, buf, stored_len, last);

      } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);

      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
      /* The above check is made mod 2^32, for files larger than 512 MB
       * and uLong implemented on 32 bits.
       */
      init_block(s);

      if (last) {
        bi_windup(s);
      }
      // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
      //       s->compressed_len-7*last));
    }

    /* ===========================================================================
     * Save the match info and tally the frequency counts. Return true if
     * the current block must be flushed.
     */
    function _tr_tally(s, dist, lc)
    //    deflate_state *s;
    //    unsigned dist;  /* distance of matched string */
    //    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
    {
      //var out_length, in_length, dcode;

      s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
      s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

      s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
      s.last_lit++;

      if (dist === 0) {
        /* lc is the unmatched char */
        s.dyn_ltree[lc * 2]/*.Freq*/++;
      } else {
        s.matches++;
        /* Here, lc is the match length - MIN_MATCH */
        dist--;             /* dist = match distance - 1 */
        //Assert((ush)dist < (ush)MAX_DIST(s) &&
        //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
        //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

        s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]/*.Freq*/++;
        s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
      }

    // (!) This block is disabled in zlib defaults,
    // don't enable it for binary compatibility

    //#ifdef TRUNCATE_BLOCK
    //  /* Try to guess if it is profitable to stop the current block here */
    //  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
    //    /* Compute an upper bound for the compressed length */
    //    out_length = s.last_lit*8;
    //    in_length = s.strstart - s.block_start;
    //
    //    for (dcode = 0; dcode < D_CODES; dcode++) {
    //      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
    //    }
    //    out_length >>>= 3;
    //    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
    //    //       s->last_lit, in_length, out_length,
    //    //       100L - out_length*100L/in_length));
    //    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
    //      return true;
    //    }
    //  }
    //#endif

      return (s.last_lit === s.lit_bufsize - 1);
      /* We avoid equality with lit_bufsize because of wraparound at 64K
       * on 16 bit machines and because stored blocks are restricted to
       * 64K-1 bytes.
       */
    }

    var _tr_init_1  = _tr_init;
    var _tr_stored_block_1 = _tr_stored_block;
    var _tr_flush_block_1  = _tr_flush_block;
    var _tr_tally_1 = _tr_tally;
    var _tr_align_1 = _tr_align;

    var trees = {
    	_tr_init: _tr_init_1,
    	_tr_stored_block: _tr_stored_block_1,
    	_tr_flush_block: _tr_flush_block_1,
    	_tr_tally: _tr_tally_1,
    	_tr_align: _tr_align_1
    };

    // Note: adler32 takes 12% for level 0 and 2% for level 6.
    // It isn't worth it to make additional optimizations as in original.
    // Small size is preferable.

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    function adler32(adler, buf, len, pos) {
      var s1 = (adler & 0xffff) |0,
          s2 = ((adler >>> 16) & 0xffff) |0,
          n = 0;

      while (len !== 0) {
        // Set limit ~ twice less than 5552, to keep
        // s2 in 31-bits, because we force signed ints.
        // in other case %= will fail.
        n = len > 2000 ? 2000 : len;
        len -= n;

        do {
          s1 = (s1 + buf[pos++]) |0;
          s2 = (s2 + s1) |0;
        } while (--n);

        s1 %= 65521;
        s2 %= 65521;
      }

      return (s1 | (s2 << 16)) |0;
    }


    var adler32_1 = adler32;

    // Note: we can't get significant speed boost here.
    // So write code to minimize size - no pregenerated tables
    // and array tools dependencies.

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    // Use ordinary array, since untyped makes no boost here
    function makeTable() {
      var c, table = [];

      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
      }

      return table;
    }

    // Create table on load. Just 255 signed longs. Not a problem.
    var crcTable = makeTable();


    function crc32(crc, buf, len, pos) {
      var t = crcTable,
          end = pos + len;

      crc ^= -1;

      for (var i = pos; i < end; i++) {
        crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
      }

      return (crc ^ (-1)); // >>> 0;
    }


    var crc32_1 = crc32;

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    var messages = {
      2:      'need dictionary',     /* Z_NEED_DICT       2  */
      1:      'stream end',          /* Z_STREAM_END      1  */
      0:      '',                    /* Z_OK              0  */
      '-1':   'file error',          /* Z_ERRNO         (-1) */
      '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
      '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
      '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
      '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
      '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.







    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    /* Allowed flush values; see deflate() and inflate() below for details */
    var Z_NO_FLUSH      = 0;
    var Z_PARTIAL_FLUSH = 1;
    //var Z_SYNC_FLUSH    = 2;
    var Z_FULL_FLUSH    = 3;
    var Z_FINISH        = 4;
    var Z_BLOCK         = 5;
    //var Z_TREES         = 6;


    /* Return codes for the compression/decompression functions. Negative values
     * are errors, positive values are used for special but normal events.
     */
    var Z_OK            = 0;
    var Z_STREAM_END    = 1;
    //var Z_NEED_DICT     = 2;
    //var Z_ERRNO         = -1;
    var Z_STREAM_ERROR  = -2;
    var Z_DATA_ERROR    = -3;
    //var Z_MEM_ERROR     = -4;
    var Z_BUF_ERROR     = -5;
    //var Z_VERSION_ERROR = -6;


    /* compression levels */
    //var Z_NO_COMPRESSION      = 0;
    //var Z_BEST_SPEED          = 1;
    //var Z_BEST_COMPRESSION    = 9;
    var Z_DEFAULT_COMPRESSION = -1;


    var Z_FILTERED            = 1;
    var Z_HUFFMAN_ONLY        = 2;
    var Z_RLE                 = 3;
    var Z_FIXED$1               = 4;
    var Z_DEFAULT_STRATEGY    = 0;

    /* Possible values of the data_type field (though see inflate()) */
    //var Z_BINARY              = 0;
    //var Z_TEXT                = 1;
    //var Z_ASCII               = 1; // = Z_TEXT
    var Z_UNKNOWN$1             = 2;


    /* The deflate compression method */
    var Z_DEFLATED  = 8;

    /*============================================================================*/


    var MAX_MEM_LEVEL = 9;
    /* Maximum value for memLevel in deflateInit2 */
    var MAX_WBITS = 15;
    /* 32K LZ77 window */
    var DEF_MEM_LEVEL = 8;


    var LENGTH_CODES$1  = 29;
    /* number of length codes, not counting the special END_BLOCK code */
    var LITERALS$1      = 256;
    /* number of literal bytes 0..255 */
    var L_CODES$1       = LITERALS$1 + 1 + LENGTH_CODES$1;
    /* number of Literal or Length codes, including the END_BLOCK code */
    var D_CODES$1       = 30;
    /* number of distance codes */
    var BL_CODES$1      = 19;
    /* number of codes used to transfer the bit lengths */
    var HEAP_SIZE$1     = 2 * L_CODES$1 + 1;
    /* maximum heap size */
    var MAX_BITS$1  = 15;
    /* All codes must not exceed MAX_BITS bits */

    var MIN_MATCH$1 = 3;
    var MAX_MATCH$1 = 258;
    var MIN_LOOKAHEAD = (MAX_MATCH$1 + MIN_MATCH$1 + 1);

    var PRESET_DICT = 0x20;

    var INIT_STATE = 42;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;

    var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
    var BS_BLOCK_DONE     = 2; /* block flush performed */
    var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
    var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

    var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

    function err(strm, errorCode) {
      strm.msg = messages[errorCode];
      return errorCode;
    }

    function rank(f) {
      return ((f) << 1) - ((f) > 4 ? 9 : 0);
    }

    function zero$1(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


    /* =========================================================================
     * Flush as much pending output as possible. All deflate() output goes
     * through this function so some applications may wish to modify it
     * to avoid allocating a large strm->output buffer and copying into it.
     * (See also read_buf()).
     */
    function flush_pending(strm) {
      var s = strm.state;

      //_tr_flush_bits(s);
      var len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) { return; }

      common.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    }


    function flush_block_only(s, last) {
      trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    }


    function put_byte(s, b) {
      s.pending_buf[s.pending++] = b;
    }


    /* =========================================================================
     * Put a short in the pending buffer. The 16-bit value is put in MSB order.
     * IN assertion: the stream state is correct and there is enough room in
     * pending_buf.
     */
    function putShortMSB(s, b) {
    //  put_byte(s, (Byte)(b >> 8));
    //  put_byte(s, (Byte)(b & 0xff));
      s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
      s.pending_buf[s.pending++] = b & 0xff;
    }


    /* ===========================================================================
     * Read a new buffer from the current input stream, update the adler32
     * and total number of bytes read.  All deflate() input goes through
     * this function so some applications may wish to modify it to avoid
     * allocating a large strm->input buffer and copying from it.
     * (See also flush_pending()).
     */
    function read_buf(strm, buf, start, size) {
      var len = strm.avail_in;

      if (len > size) { len = size; }
      if (len === 0) { return 0; }

      strm.avail_in -= len;

      // zmemcpy(buf, strm->next_in, len);
      common.arraySet(buf, strm.input, strm.next_in, len, start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32_1(strm.adler, buf, len, start);
      }

      else if (strm.state.wrap === 2) {
        strm.adler = crc32_1(strm.adler, buf, len, start);
      }

      strm.next_in += len;
      strm.total_in += len;

      return len;
    }


    /* ===========================================================================
     * Set match_start to the longest match starting at the given string and
     * return its length. Matches shorter or equal to prev_length are discarded,
     * in which case the result is equal to prev_length and match_start is
     * garbage.
     * IN assertions: cur_match is the head of the hash chain for the current
     *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
     * OUT assertion: the match length is not greater than s->lookahead.
     */
    function longest_match(s, cur_match) {
      var chain_length = s.max_chain_length;      /* max hash chain length */
      var scan = s.strstart; /* current string */
      var match;                       /* matched string */
      var len;                           /* length of current match */
      var best_len = s.prev_length;              /* best match length so far */
      var nice_match = s.nice_match;             /* stop if match long enough */
      var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
          s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0/*NIL*/;

      var _win = s.window; // shortcut

      var wmask = s.w_mask;
      var prev  = s.prev;

      /* Stop when cur_match becomes <= limit. To simplify the code,
       * we prevent matches with the string of window index 0.
       */

      var strend = s.strstart + MAX_MATCH$1;
      var scan_end1  = _win[scan + best_len - 1];
      var scan_end   = _win[scan + best_len];

      /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
       * It is easy to get rid of this optimization if necessary.
       */
      // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

      /* Do not waste too much time if we already have a good match: */
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      /* Do not look for matches beyond the end of the input. This is necessary
       * to make deflate deterministic.
       */
      if (nice_match > s.lookahead) { nice_match = s.lookahead; }

      // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

      do {
        // Assert(cur_match < s->strstart, "no future");
        match = cur_match;

        /* Skip to next match if the match length cannot increase
         * or if the match length is less than 2.  Note that the checks below
         * for insufficient lookahead only occur occasionally for performance
         * reasons.  Therefore uninitialized memory will be accessed, and
         * conditional jumps will be made that depend on those values.
         * However the length of the match is limited to the lookahead, so
         * the output of deflate is not affected by the uninitialized values.
         */

        if (_win[match + best_len]     !== scan_end  ||
            _win[match + best_len - 1] !== scan_end1 ||
            _win[match]                !== _win[scan] ||
            _win[++match]              !== _win[scan + 1]) {
          continue;
        }

        /* The check at best_len-1 can be removed because it will be made
         * again later. (This heuristic is not always a win.)
         * It is not necessary to compare scan[2] and match[2] since they
         * are always equal when the other bytes match, given that
         * the hash keys are equal and that HASH_BITS >= 8.
         */
        scan += 2;
        match++;
        // Assert(*scan == *match, "match[2]?");

        /* We check for insufficient lookahead only every 8th comparison;
         * the 256th check will be made at strstart+258.
         */
        do {
          /*jshint noempty:false*/
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 scan < strend);

        // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

        len = MAX_MATCH$1 - (strend - scan);
        scan = strend - MAX_MATCH$1;

        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1  = _win[scan + best_len - 1];
          scan_end   = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    }


    /* ===========================================================================
     * Fill the window when the lookahead becomes insufficient.
     * Updates strstart and lookahead.
     *
     * IN assertion: lookahead < MIN_LOOKAHEAD
     * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
     *    At least one byte has been read, or avail_in == 0; reads are
     *    performed for at least two bytes (required for the zip translate_eol
     *    option -- not supported here).
     */
    function fill_window(s) {
      var _w_size = s.w_size;
      var p, n, m, more, str;

      //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

      do {
        more = s.window_size - s.lookahead - s.strstart;

        // JS ints have 32 bit, block below not needed
        /* Deal with !@#$% 64K limit: */
        //if (sizeof(int) <= 2) {
        //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
        //        more = wsize;
        //
        //  } else if (more == (unsigned)(-1)) {
        //        /* Very unlikely, but possible on 16 bit machine if
        //         * strstart == 0 && lookahead == 1 (input done a byte at time)
        //         */
        //        more--;
        //    }
        //}


        /* If the window is almost full and there is insufficient lookahead,
         * move the upper half to the lower one to make room in the upper half.
         */
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

          common.arraySet(s.window, s.window, _w_size, _w_size, 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          /* we now have strstart >= MAX_DIST */
          s.block_start -= _w_size;

          /* Slide the hash table (could be avoided with 32 bit values
           at the expense of memory usage). We slide even when level == 0
           to keep the hash table consistent if we switch back to level > 0
           later. (Using level 0 permanently is not an optimal usage of
           zlib, so we don't care about this pathological case.)
           */

          n = s.hash_size;
          p = n;
          do {
            m = s.head[--p];
            s.head[p] = (m >= _w_size ? m - _w_size : 0);
          } while (--n);

          n = _w_size;
          p = n;
          do {
            m = s.prev[--p];
            s.prev[p] = (m >= _w_size ? m - _w_size : 0);
            /* If n is not on any hash chain, prev[n] is garbage but
             * its value will never be used.
             */
          } while (--n);

          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }

        /* If there was no sliding:
         *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
         *    more == window_size - lookahead - strstart
         * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
         * => more >= window_size - 2*WSIZE + 2
         * In the BIG_MEM or MMAP case (not yet supported),
         *   window_size == input_size + MIN_LOOKAHEAD  &&
         *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
         * Otherwise, window_size == 2*WSIZE so more >= 2.
         * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
         */
        //Assert(more >= 2, "more < 2");
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;

        /* Initialize the hash value now that we have some input: */
        if (s.lookahead + s.insert >= MIN_MATCH$1) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];

          /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
    //#if MIN_MATCH != 3
    //        Call update_hash() MIN_MATCH-3 more times
    //#endif
          while (s.insert) {
            /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
            s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH$1 - 1]) & s.hash_mask;

            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH$1) {
              break;
            }
          }
        }
        /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
         * but this is not important since only literal bytes will be emitted.
         */

      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

      /* If the WIN_INIT bytes after the end of the current data have never been
       * written, then zero those bytes in order to avoid memory check reports of
       * the use of uninitialized (or uninitialised as Julian writes) bytes by
       * the longest match routines.  Update the high water mark for the next
       * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
       * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
       */
    //  if (s.high_water < s.window_size) {
    //    var curr = s.strstart + s.lookahead;
    //    var init = 0;
    //
    //    if (s.high_water < curr) {
    //      /* Previous high water mark below current data -- zero WIN_INIT
    //       * bytes or up to end of window, whichever is less.
    //       */
    //      init = s.window_size - curr;
    //      if (init > WIN_INIT)
    //        init = WIN_INIT;
    //      zmemzero(s->window + curr, (unsigned)init);
    //      s->high_water = curr + init;
    //    }
    //    else if (s->high_water < (ulg)curr + WIN_INIT) {
    //      /* High water mark at or above current data, but below current data
    //       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
    //       * to end of window, whichever is less.
    //       */
    //      init = (ulg)curr + WIN_INIT - s->high_water;
    //      if (init > s->window_size - s->high_water)
    //        init = s->window_size - s->high_water;
    //      zmemzero(s->window + s->high_water, (unsigned)init);
    //      s->high_water += init;
    //    }
    //  }
    //
    //  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
    //    "not enough room for search");
    }

    /* ===========================================================================
     * Copy without compression as much as possible from the input stream, return
     * the current block state.
     * This function does not insert new strings in the dictionary since
     * uncompressible data is probably not useful. This function is used
     * only for the level=0 compression option.
     * NOTE: this function should be optimized to avoid extra copying from
     * window to pending_buf.
     */
    function deflate_stored(s, flush) {
      /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
       * to pending_buf_size, and each stored block has a 5 byte header:
       */
      var max_block_size = 0xffff;

      if (max_block_size > s.pending_buf_size - 5) {
        max_block_size = s.pending_buf_size - 5;
      }

      /* Copy as much as possible from input to output: */
      for (;;) {
        /* Fill the window as much as possible: */
        if (s.lookahead <= 1) {

          //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
          //  s->block_start >= (long)s->w_size, "slide too late");
    //      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
    //        s.block_start >= s.w_size)) {
    //        throw  new Error("slide too late");
    //      }

          fill_window(s);
          if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }

          if (s.lookahead === 0) {
            break;
          }
          /* flush the current block */
        }
        //Assert(s->block_start >= 0L, "block gone");
    //    if (s.block_start < 0) throw new Error("block gone");

        s.strstart += s.lookahead;
        s.lookahead = 0;

        /* Emit a stored block if pending_buf will be full: */
        var max_start = s.block_start + max_block_size;

        if (s.strstart === 0 || s.strstart >= max_start) {
          /* strstart == 0 is possible when wraparound on 16-bit machine */
          s.lookahead = s.strstart - max_start;
          s.strstart = max_start;
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/


        }
        /* Flush if we may have to slide, otherwise block_start may become
         * negative and the data will be gone:
         */
        if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }

      s.insert = 0;

      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }

      if (s.strstart > s.block_start) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

      return BS_NEED_MORE;
    }

    /* ===========================================================================
     * Compress as much as possible from the input stream, return the current
     * block state.
     * This function does not perform lazy evaluation of matches and inserts
     * new strings in the dictionary only for unmatched strings or for short
     * matches. It is used only for the fast compression options.
     */
    function deflate_fast(s, flush) {
      var hash_head;        /* head of the hash chain */
      var bflush;           /* set if current block must be flushed */

      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the next match, plus MIN_MATCH bytes to insert the
         * string following the next match.
         */
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break; /* flush the current block */
          }
        }

        /* Insert the string window[strstart .. strstart+2] in the
         * dictionary, and set hash_head to the head of the hash chain:
         */
        hash_head = 0/*NIL*/;
        if (s.lookahead >= MIN_MATCH$1) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }

        /* Find the longest match, discarding those <= prev_length.
         * At this point we have always match_length < MIN_MATCH
         */
        if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
          /* To simplify the code, we prevent matches with the string
           * of window index 0 (in particular we have to avoid a match
           * of the string with itself at the start of the input file).
           */
          s.match_length = longest_match(s, hash_head);
          /* longest_match() sets match_start */
        }
        if (s.match_length >= MIN_MATCH$1) {
          // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

          /*** _tr_tally_dist(s, s.strstart - s.match_start,
                         s.match_length - MIN_MATCH, bflush); ***/
          bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH$1);

          s.lookahead -= s.match_length;

          /* Insert new strings in the hash table only if the match length
           * is not too large. This saves time but degrades compression.
           */
          if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH$1) {
            s.match_length--; /* string at strstart already in table */
            do {
              s.strstart++;
              /*** INSERT_STRING(s, s.strstart, hash_head); ***/
              s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
              /***/
              /* strstart never exceeds WSIZE-MAX_MATCH, so there are
               * always MIN_MATCH bytes ahead.
               */
            } while (--s.match_length !== 0);
            s.strstart++;
          } else
          {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
            s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

    //#if MIN_MATCH != 3
    //                Call UPDATE_HASH() MIN_MATCH-3 more times
    //#endif
            /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
             * matter since it will be recomputed at next deflate call.
             */
          }
        } else {
          /* No match, output a literal byte */
          //Tracevv((stderr,"%c", s.window[s.strstart]));
          /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = ((s.strstart < (MIN_MATCH$1 - 1)) ? s.strstart : MIN_MATCH$1 - 1);
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* ===========================================================================
     * Same as above, but achieves better compression. We use a lazy
     * evaluation for matches: a match is finally adopted only if there is
     * no better match at the next window position.
     */
    function deflate_slow(s, flush) {
      var hash_head;          /* head of hash chain */
      var bflush;              /* set if current block must be flushed */

      var max_insert;

      /* Process the input block. */
      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the next match, plus MIN_MATCH bytes to insert the
         * string following the next match.
         */
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) { break; } /* flush the current block */
        }

        /* Insert the string window[strstart .. strstart+2] in the
         * dictionary, and set hash_head to the head of the hash chain:
         */
        hash_head = 0/*NIL*/;
        if (s.lookahead >= MIN_MATCH$1) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }

        /* Find the longest match, discarding those <= prev_length.
         */
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH$1 - 1;

        if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
            s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
          /* To simplify the code, we prevent matches with the string
           * of window index 0 (in particular we have to avoid a match
           * of the string with itself at the start of the input file).
           */
          s.match_length = longest_match(s, hash_head);
          /* longest_match() sets match_start */

          if (s.match_length <= 5 &&
             (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH$1 && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

            /* If prev_match is also MIN_MATCH, match_start is garbage
             * but we will ignore the current match anyway.
             */
            s.match_length = MIN_MATCH$1 - 1;
          }
        }
        /* If there was a match at the previous step and the current
         * match is not better, output the previous match:
         */
        if (s.prev_length >= MIN_MATCH$1 && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH$1;
          /* Do not insert strings in hash table beyond this. */

          //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

          /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                         s.prev_length - MIN_MATCH, bflush);***/
          bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH$1);
          /* Insert in hash table all strings up to the end of the match.
           * strstart-1 and strstart are already inserted. If there is not
           * enough lookahead, the last two strings are not inserted in
           * the hash table.
           */
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              /*** INSERT_STRING(s, s.strstart, hash_head); ***/
              s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
              /***/
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH$1 - 1;
          s.strstart++;

          if (bflush) {
            /*** FLUSH_BLOCK(s, 0); ***/
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
            /***/
          }

        } else if (s.match_available) {
          /* If there was no match at the previous position, output a
           * single literal. If there was a match but the current match
           * is longer, truncate the previous match to a single literal.
           */
          //Tracevv((stderr,"%c", s->window[s->strstart-1]));
          /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
          bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

          if (bflush) {
            /*** FLUSH_BLOCK_ONLY(s, 0) ***/
            flush_block_only(s, false);
            /***/
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          /* There is no previous match to compare with, wait for
           * the next step to decide.
           */
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      //Assert (flush != Z_NO_FLUSH, "no flush?");
      if (s.match_available) {
        //Tracevv((stderr,"%c", s->window[s->strstart-1]));
        /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
        bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH$1 - 1 ? s.strstart : MIN_MATCH$1 - 1;
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

      return BS_BLOCK_DONE;
    }


    /* ===========================================================================
     * For Z_RLE, simply look for runs of bytes, generate matches only of distance
     * one.  Do not maintain a hash table.  (It will be regenerated if this run of
     * deflate switches away from Z_RLE.)
     */
    function deflate_rle(s, flush) {
      var bflush;            /* set if current block must be flushed */
      var prev;              /* byte at distance one to match */
      var scan, strend;      /* scan goes up to strend for length of run */

      var _win = s.window;

      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the longest run, plus one for the unrolled loop.
         */
        if (s.lookahead <= MAX_MATCH$1) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH$1 && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) { break; } /* flush the current block */
        }

        /* See how many times the previous byte repeats */
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH$1 && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH$1;
            do {
              /*jshint noempty:false*/
            } while (prev === _win[++scan] && prev === _win[++scan] &&
                     prev === _win[++scan] && prev === _win[++scan] &&
                     prev === _win[++scan] && prev === _win[++scan] &&
                     prev === _win[++scan] && prev === _win[++scan] &&
                     scan < strend);
            s.match_length = MAX_MATCH$1 - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
          //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
        }

        /* Emit match if have run of MIN_MATCH or longer, else emit literal */
        if (s.match_length >= MIN_MATCH$1) {
          //check_match(s, s.strstart, s.strstart - 1, s.match_length);

          /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
          bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH$1);

          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          /* No match, output a literal byte */
          //Tracevv((stderr,"%c", s->window[s->strstart]));
          /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* ===========================================================================
     * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
     * (It will be regenerated if this run of deflate switches away from Huffman.)
     */
    function deflate_huff(s, flush) {
      var bflush;             /* set if current block must be flushed */

      for (;;) {
        /* Make sure that we have a literal to write. */
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;      /* flush the current block */
          }
        }

        /* Output a literal byte */
        s.match_length = 0;
        //Tracevv((stderr,"%c", s->window[s->strstart]));
        /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
        bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* Values for max_lazy_match, good_match and max_chain_length, depending on
     * the desired pack level (0..9). The values given below have been tuned to
     * exclude worst case performance for pathological files. Better values may be
     * found for specific files.
     */
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }

    var configuration_table;

    configuration_table = [
      /*      good lazy nice chain */
      new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
      new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
      new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
      new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

      new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
      new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
      new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
      new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
      new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
      new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
    ];


    /* ===========================================================================
     * Initialize the "longest match" routines for a new zlib stream
     */
    function lm_init(s) {
      s.window_size = 2 * s.w_size;

      /*** CLEAR_HASH(s); ***/
      zero$1(s.head); // Fill with NIL (= 0);

      /* Set the default configuration parameters:
       */
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;

      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH$1 - 1;
      s.match_available = 0;
      s.ins_h = 0;
    }


    function DeflateState() {
      this.strm = null;            /* pointer back to this zlib stream */
      this.status = 0;            /* as the name implies */
      this.pending_buf = null;      /* output still pending */
      this.pending_buf_size = 0;  /* size of pending_buf */
      this.pending_out = 0;       /* next pending byte to output to the stream */
      this.pending = 0;           /* nb of bytes in the pending buffer */
      this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
      this.gzhead = null;         /* gzip header information to write */
      this.gzindex = 0;           /* where in extra, name, or comment */
      this.method = Z_DEFLATED; /* can only be DEFLATED */
      this.last_flush = -1;   /* value of flush param for previous deflate call */

      this.w_size = 0;  /* LZ77 window size (32K by default) */
      this.w_bits = 0;  /* log2(w_size)  (8..16) */
      this.w_mask = 0;  /* w_size - 1 */

      this.window = null;
      /* Sliding window. Input bytes are read into the second half of the window,
       * and move to the first half later to keep a dictionary of at least wSize
       * bytes. With this organization, matches are limited to a distance of
       * wSize-MAX_MATCH bytes, but this ensures that IO is always
       * performed with a length multiple of the block size.
       */

      this.window_size = 0;
      /* Actual size of window: 2*wSize, except when the user input buffer
       * is directly used as sliding window.
       */

      this.prev = null;
      /* Link to older string with same hash index. To limit the size of this
       * array to 64K, this link is maintained only for the last 32K strings.
       * An index in this array is thus a window index modulo 32K.
       */

      this.head = null;   /* Heads of the hash chains or NIL. */

      this.ins_h = 0;       /* hash index of string to be inserted */
      this.hash_size = 0;   /* number of elements in hash table */
      this.hash_bits = 0;   /* log2(hash_size) */
      this.hash_mask = 0;   /* hash_size-1 */

      this.hash_shift = 0;
      /* Number of bits by which ins_h must be shifted at each input
       * step. It must be such that after MIN_MATCH steps, the oldest
       * byte no longer takes part in the hash key, that is:
       *   hash_shift * MIN_MATCH >= hash_bits
       */

      this.block_start = 0;
      /* Window position at the beginning of the current output block. Gets
       * negative when the window is moved backwards.
       */

      this.match_length = 0;      /* length of best match */
      this.prev_match = 0;        /* previous match */
      this.match_available = 0;   /* set if previous match exists */
      this.strstart = 0;          /* start of string to insert */
      this.match_start = 0;       /* start of matching string */
      this.lookahead = 0;         /* number of valid bytes ahead in window */

      this.prev_length = 0;
      /* Length of the best match at previous step. Matches not greater than this
       * are discarded. This is used in the lazy match evaluation.
       */

      this.max_chain_length = 0;
      /* To speed up deflation, hash chains are never searched beyond this
       * length.  A higher limit improves compression ratio but degrades the
       * speed.
       */

      this.max_lazy_match = 0;
      /* Attempt to find a better match only when the current match is strictly
       * smaller than this value. This mechanism is used only for compression
       * levels >= 4.
       */
      // That's alias to max_lazy_match, don't use directly
      //this.max_insert_length = 0;
      /* Insert new strings in the hash table only if the match length is not
       * greater than this length. This saves time but degrades compression.
       * max_insert_length is used only for compression levels <= 3.
       */

      this.level = 0;     /* compression level (1..9) */
      this.strategy = 0;  /* favor or force Huffman coding*/

      this.good_match = 0;
      /* Use a faster search when the previous match is longer than this */

      this.nice_match = 0; /* Stop searching when current match exceeds this */

                  /* used by trees.c: */

      /* Didn't use ct_data typedef below to suppress compiler warning */

      // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
      // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
      // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

      // Use flat array of DOUBLE size, with interleaved fata,
      // because JS does not support effective
      this.dyn_ltree  = new common.Buf16(HEAP_SIZE$1 * 2);
      this.dyn_dtree  = new common.Buf16((2 * D_CODES$1 + 1) * 2);
      this.bl_tree    = new common.Buf16((2 * BL_CODES$1 + 1) * 2);
      zero$1(this.dyn_ltree);
      zero$1(this.dyn_dtree);
      zero$1(this.bl_tree);

      this.l_desc   = null;         /* desc. for literal tree */
      this.d_desc   = null;         /* desc. for distance tree */
      this.bl_desc  = null;         /* desc. for bit length tree */

      //ush bl_count[MAX_BITS+1];
      this.bl_count = new common.Buf16(MAX_BITS$1 + 1);
      /* number of codes at each bit length for an optimal tree */

      //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
      this.heap = new common.Buf16(2 * L_CODES$1 + 1);  /* heap used to build the Huffman trees */
      zero$1(this.heap);

      this.heap_len = 0;               /* number of elements in the heap */
      this.heap_max = 0;               /* element of largest frequency */
      /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
       * The same heap array is used to build all trees.
       */

      this.depth = new common.Buf16(2 * L_CODES$1 + 1); //uch depth[2*L_CODES+1];
      zero$1(this.depth);
      /* Depth of each subtree used as tie breaker for trees of equal frequency
       */

      this.l_buf = 0;          /* buffer index for literals or lengths */

      this.lit_bufsize = 0;
      /* Size of match buffer for literals/lengths.  There are 4 reasons for
       * limiting lit_bufsize to 64K:
       *   - frequencies can be kept in 16 bit counters
       *   - if compression is not successful for the first block, all input
       *     data is still in the window so we can still emit a stored block even
       *     when input comes from standard input.  (This can also be done for
       *     all blocks if lit_bufsize is not greater than 32K.)
       *   - if compression is not successful for a file smaller than 64K, we can
       *     even emit a stored file instead of a stored block (saving 5 bytes).
       *     This is applicable only for zip (not gzip or zlib).
       *   - creating new Huffman trees less frequently may not provide fast
       *     adaptation to changes in the input data statistics. (Take for
       *     example a binary file with poorly compressible code followed by
       *     a highly compressible string table.) Smaller buffer sizes give
       *     fast adaptation but have of course the overhead of transmitting
       *     trees more frequently.
       *   - I can't count above 4
       */

      this.last_lit = 0;      /* running index in l_buf */

      this.d_buf = 0;
      /* Buffer index for distances. To simplify the code, d_buf and l_buf have
       * the same number of elements. To use different lengths, an extra flag
       * array would be necessary.
       */

      this.opt_len = 0;       /* bit length of current block with optimal trees */
      this.static_len = 0;    /* bit length of current block with static trees */
      this.matches = 0;       /* number of string matches in current block */
      this.insert = 0;        /* bytes at end of window left to insert */


      this.bi_buf = 0;
      /* Output buffer. bits are inserted starting at the bottom (least
       * significant bits).
       */
      this.bi_valid = 0;
      /* Number of valid bits in bi_buf.  All bits above the last valid bit
       * are always zero.
       */

      // Used for window memory init. We safely ignore it for JS. That makes
      // sense only for pointers and memory check tools.
      //this.high_water = 0;
      /* High water mark offset in window for initialized bytes -- bytes above
       * this are set to zero in order to avoid memory check warnings when
       * longest match routines access bytes past the input.  This is then
       * updated to the new high water mark.
       */
    }


    function deflateResetKeep(strm) {
      var s;

      if (!strm || !strm.state) {
        return err(strm, Z_STREAM_ERROR);
      }

      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN$1;

      s = strm.state;
      s.pending = 0;
      s.pending_out = 0;

      if (s.wrap < 0) {
        s.wrap = -s.wrap;
        /* was made negative by deflate(..., Z_FINISH); */
      }
      s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
      strm.adler = (s.wrap === 2) ?
        0  // crc32(0, Z_NULL, 0)
      :
        1; // adler32(0, Z_NULL, 0)
      s.last_flush = Z_NO_FLUSH;
      trees._tr_init(s);
      return Z_OK;
    }


    function deflateReset(strm) {
      var ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    }


    function deflateSetHeader(strm, head) {
      if (!strm || !strm.state) { return Z_STREAM_ERROR; }
      if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
      strm.state.gzhead = head;
      return Z_OK;
    }


    function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
      if (!strm) { // === Z_NULL
        return Z_STREAM_ERROR;
      }
      var wrap = 1;

      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }

      if (windowBits < 0) { /* suppress zlib wrapper */
        wrap = 0;
        windowBits = -windowBits;
      }

      else if (windowBits > 15) {
        wrap = 2;           /* write gzip wrapper instead */
        windowBits -= 16;
      }


      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
        windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
        strategy < 0 || strategy > Z_FIXED$1) {
        return err(strm, Z_STREAM_ERROR);
      }


      if (windowBits === 8) {
        windowBits = 9;
      }
      /* until 256-byte window bug fixed */

      var s = new DeflateState();

      strm.state = s;
      s.strm = strm;

      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;

      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH$1 - 1) / MIN_MATCH$1);

      s.window = new common.Buf8(s.w_size * 2);
      s.head = new common.Buf16(s.hash_size);
      s.prev = new common.Buf16(s.w_size);

      // Don't need mem init magic for JS.
      //s.high_water = 0;  /* nothing written to s->window yet */

      s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

      s.pending_buf_size = s.lit_bufsize * 4;

      //overlay = (ushf *) ZALLOC(strm, s->lit_bufsize, sizeof(ush)+2);
      //s->pending_buf = (uchf *) overlay;
      s.pending_buf = new common.Buf8(s.pending_buf_size);

      // It is offset from `s.pending_buf` (size is `s.lit_bufsize * 2`)
      //s->d_buf = overlay + s->lit_bufsize/sizeof(ush);
      s.d_buf = 1 * s.lit_bufsize;

      //s->l_buf = s->pending_buf + (1+sizeof(ush))*s->lit_bufsize;
      s.l_buf = (1 + 2) * s.lit_bufsize;

      s.level = level;
      s.strategy = strategy;
      s.method = method;

      return deflateReset(strm);
    }

    function deflateInit(strm, level) {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    }


    function deflate(strm, flush) {
      var old_flush, s;
      var beg, val; // for gzip header write only

      if (!strm || !strm.state ||
        flush > Z_BLOCK || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }

      s = strm.state;

      if (!strm.output ||
          (!strm.input && strm.avail_in !== 0) ||
          (s.status === FINISH_STATE && flush !== Z_FINISH)) {
        return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }

      s.strm = strm; /* just in case */
      old_flush = s.last_flush;
      s.last_flush = flush;

      /* Write the header */
      if (s.status === INIT_STATE) {

        if (s.wrap === 2) { // GZIP header
          strm.adler = 0;  //crc32(0L, Z_NULL, 0);
          put_byte(s, 31);
          put_byte(s, 139);
          put_byte(s, 8);
          if (!s.gzhead) { // s->gzhead == Z_NULL
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 :
                        (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                         4 : 0));
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
          }
          else {
            put_byte(s, (s.gzhead.text ? 1 : 0) +
                        (s.gzhead.hcrc ? 2 : 0) +
                        (!s.gzhead.extra ? 0 : 4) +
                        (!s.gzhead.name ? 0 : 8) +
                        (!s.gzhead.comment ? 0 : 16)
            );
            put_byte(s, s.gzhead.time & 0xff);
            put_byte(s, (s.gzhead.time >> 8) & 0xff);
            put_byte(s, (s.gzhead.time >> 16) & 0xff);
            put_byte(s, (s.gzhead.time >> 24) & 0xff);
            put_byte(s, s.level === 9 ? 2 :
                        (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                         4 : 0));
            put_byte(s, s.gzhead.os & 0xff);
            if (s.gzhead.extra && s.gzhead.extra.length) {
              put_byte(s, s.gzhead.extra.length & 0xff);
              put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
            }
            if (s.gzhead.hcrc) {
              strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending, 0);
            }
            s.gzindex = 0;
            s.status = EXTRA_STATE;
          }
        }
        else // DEFLATE header
        {
          var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
          var level_flags = -1;

          if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
            level_flags = 0;
          } else if (s.level < 6) {
            level_flags = 1;
          } else if (s.level === 6) {
            level_flags = 2;
          } else {
            level_flags = 3;
          }
          header |= (level_flags << 6);
          if (s.strstart !== 0) { header |= PRESET_DICT; }
          header += 31 - (header % 31);

          s.status = BUSY_STATE;
          putShortMSB(s, header);

          /* Save the adler32 of the preset dictionary: */
          if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 0xffff);
          }
          strm.adler = 1; // adler32(0L, Z_NULL, 0);
        }
      }

    //#ifdef GZIP
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra/* != Z_NULL*/) {
          beg = s.pending;  /* start of bytes to update crc */

          while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                break;
              }
            }
            put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
            s.gzindex++;
          }
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (s.gzindex === s.gzhead.extra.length) {
            s.gzindex = 0;
            s.status = NAME_STATE;
          }
        }
        else {
          s.status = NAME_STATE;
        }
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name/* != Z_NULL*/) {
          beg = s.pending;  /* start of bytes to update crc */
          //int val;

          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            // JS specific: little magic to add zero terminator to end of string
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);

          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.gzindex = 0;
            s.status = COMMENT_STATE;
          }
        }
        else {
          s.status = COMMENT_STATE;
        }
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment/* != Z_NULL*/) {
          beg = s.pending;  /* start of bytes to update crc */
          //int val;

          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            // JS specific: little magic to add zero terminator to end of string
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);

          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.status = HCRC_STATE;
          }
        }
        else {
          s.status = HCRC_STATE;
        }
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
          }
          if (s.pending + 2 <= s.pending_buf_size) {
            put_byte(s, strm.adler & 0xff);
            put_byte(s, (strm.adler >> 8) & 0xff);
            strm.adler = 0; //crc32(0L, Z_NULL, 0);
            s.status = BUSY_STATE;
          }
        }
        else {
          s.status = BUSY_STATE;
        }
      }
    //#endif

      /* Flush as much pending output as possible */
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          /* Since avail_out is 0, deflate will be called again with
           * more output space, but possibly with both pending and
           * avail_in equal to zero. There won't be anything to do,
           * but this is not an error situation so make sure we
           * return OK instead of BUF_ERROR at next call of deflate:
           */
          s.last_flush = -1;
          return Z_OK;
        }

        /* Make sure there is something to do and avoid duplicate consecutive
         * flushes. For repeated and useless calls with Z_FINISH, we keep
         * returning Z_STREAM_END instead of Z_BUF_ERROR.
         */
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
        flush !== Z_FINISH) {
        return err(strm, Z_BUF_ERROR);
      }

      /* User must not provide more input after the first FINISH: */
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR);
      }

      /* Start a new block or continue the current one.
       */
      if (strm.avail_in !== 0 || s.lookahead !== 0 ||
        (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
        var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
          (s.strategy === Z_RLE ? deflate_rle(s, flush) :
            configuration_table[s.level].func(s, flush));

        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            /* avoid BUF_ERROR next call, see above */
          }
          return Z_OK;
          /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
           * of deflate should use the same flush parameter to make sure
           * that the flush is complete. So we don't have to output an
           * empty block here, this will be done at next call. This also
           * ensures that for a very small output buffer, we emit at most
           * one empty block.
           */
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            trees._tr_align(s);
          }
          else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

            trees._tr_stored_block(s, 0, 0, false);
            /* For a full flush, this empty block will be recognized
             * as a special marker by inflate_sync().
             */
            if (flush === Z_FULL_FLUSH) {
              /*** CLEAR_HASH(s); ***/             /* forget history */
              zero$1(s.head); // Fill with NIL (= 0);

              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
            return Z_OK;
          }
        }
      }
      //Assert(strm->avail_out > 0, "bug2");
      //if (strm.avail_out <= 0) { throw new Error("bug2");}

      if (flush !== Z_FINISH) { return Z_OK; }
      if (s.wrap <= 0) { return Z_STREAM_END; }

      /* Write the trailer */
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        put_byte(s, (strm.adler >> 16) & 0xff);
        put_byte(s, (strm.adler >> 24) & 0xff);
        put_byte(s, strm.total_in & 0xff);
        put_byte(s, (strm.total_in >> 8) & 0xff);
        put_byte(s, (strm.total_in >> 16) & 0xff);
        put_byte(s, (strm.total_in >> 24) & 0xff);
      }
      else
      {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }

      flush_pending(strm);
      /* If avail_out is zero, the application will call deflate again
       * to flush the rest.
       */
      if (s.wrap > 0) { s.wrap = -s.wrap; }
      /* write the trailer only once! */
      return s.pending !== 0 ? Z_OK : Z_STREAM_END;
    }

    function deflateEnd(strm) {
      var status;

      if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
        return Z_STREAM_ERROR;
      }

      status = strm.state.status;
      if (status !== INIT_STATE &&
        status !== EXTRA_STATE &&
        status !== NAME_STATE &&
        status !== COMMENT_STATE &&
        status !== HCRC_STATE &&
        status !== BUSY_STATE &&
        status !== FINISH_STATE
      ) {
        return err(strm, Z_STREAM_ERROR);
      }

      strm.state = null;

      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
    }


    /* =========================================================================
     * Initializes the compression dictionary from the given byte
     * sequence without producing any compressed output.
     */
    function deflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;

      var s;
      var str, n;
      var wrap;
      var avail;
      var next;
      var input;
      var tmpDict;

      if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
        return Z_STREAM_ERROR;
      }

      s = strm.state;
      wrap = s.wrap;

      if (wrap === 2 || (wrap === 1 && s.status !== INIT_STATE) || s.lookahead) {
        return Z_STREAM_ERROR;
      }

      /* when using zlib wrappers, compute Adler-32 for provided dictionary */
      if (wrap === 1) {
        /* adler32(strm->adler, dictionary, dictLength); */
        strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
      }

      s.wrap = 0;   /* avoid computing Adler-32 in read_buf */

      /* if dictionary would fill window, just replace the history */
      if (dictLength >= s.w_size) {
        if (wrap === 0) {            /* already empty otherwise */
          /*** CLEAR_HASH(s); ***/
          zero$1(s.head); // Fill with NIL (= 0);
          s.strstart = 0;
          s.block_start = 0;
          s.insert = 0;
        }
        /* use the tail */
        // dictionary = dictionary.slice(dictLength - s.w_size);
        tmpDict = new common.Buf8(s.w_size);
        common.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
      }
      /* insert dictionary into window and hash */
      avail = strm.avail_in;
      next = strm.next_in;
      input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s);
      while (s.lookahead >= MIN_MATCH$1) {
        str = s.strstart;
        n = s.lookahead - (MIN_MATCH$1 - 1);
        do {
          /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH$1 - 1]) & s.hash_mask;

          s.prev[str & s.w_mask] = s.head[s.ins_h];

          s.head[s.ins_h] = str;
          str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH$1 - 1;
        fill_window(s);
      }
      s.strstart += s.lookahead;
      s.block_start = s.strstart;
      s.insert = s.lookahead;
      s.lookahead = 0;
      s.match_length = s.prev_length = MIN_MATCH$1 - 1;
      s.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s.wrap = wrap;
      return Z_OK;
    }


    var deflateInit_1 = deflateInit;
    var deflateInit2_1 = deflateInit2;
    var deflateReset_1 = deflateReset;
    var deflateResetKeep_1 = deflateResetKeep;
    var deflateSetHeader_1 = deflateSetHeader;
    var deflate_2 = deflate;
    var deflateEnd_1 = deflateEnd;
    var deflateSetDictionary_1 = deflateSetDictionary;
    var deflateInfo = 'pako deflate (from Nodeca project)';

    /* Not implemented
    exports.deflateBound = deflateBound;
    exports.deflateCopy = deflateCopy;
    exports.deflateParams = deflateParams;
    exports.deflatePending = deflatePending;
    exports.deflatePrime = deflatePrime;
    exports.deflateTune = deflateTune;
    */

    var deflate_1 = {
    	deflateInit: deflateInit_1,
    	deflateInit2: deflateInit2_1,
    	deflateReset: deflateReset_1,
    	deflateResetKeep: deflateResetKeep_1,
    	deflateSetHeader: deflateSetHeader_1,
    	deflate: deflate_2,
    	deflateEnd: deflateEnd_1,
    	deflateSetDictionary: deflateSetDictionary_1,
    	deflateInfo: deflateInfo
    };

    // Quick check if we can use fast array to bin string conversion
    //
    // - apply(Array) can fail on Android 2.2
    // - apply(Uint8Array) can fail on iOS 5.1 Safari
    //
    var STR_APPLY_OK = true;
    var STR_APPLY_UIA_OK = true;

    try { String.fromCharCode.apply(null, [ 0 ]); } catch (__) { STR_APPLY_OK = false; }
    try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }


    // Table with utf8 lengths (calculated by first byte of sequence)
    // Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
    // because max possible codepoint is 0x10ffff
    var _utf8len = new common.Buf8(256);
    for (var q = 0; q < 256; q++) {
      _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
    }
    _utf8len[254] = _utf8len[254] = 1; // Invalid sequence start


    // convert string to array (typed, when possible)
    var string2buf = function (str) {
      var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

      // count binary size
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 0xfc00) === 0xdc00) {
            c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
            m_pos++;
          }
        }
        buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      }

      // allocate buffer
      buf = new common.Buf8(buf_len);

      // convert
      for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 0xfc00) === 0xdc00) {
            c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
            m_pos++;
          }
        }
        if (c < 0x80) {
          /* one byte */
          buf[i++] = c;
        } else if (c < 0x800) {
          /* two bytes */
          buf[i++] = 0xC0 | (c >>> 6);
          buf[i++] = 0x80 | (c & 0x3f);
        } else if (c < 0x10000) {
          /* three bytes */
          buf[i++] = 0xE0 | (c >>> 12);
          buf[i++] = 0x80 | (c >>> 6 & 0x3f);
          buf[i++] = 0x80 | (c & 0x3f);
        } else {
          /* four bytes */
          buf[i++] = 0xf0 | (c >>> 18);
          buf[i++] = 0x80 | (c >>> 12 & 0x3f);
          buf[i++] = 0x80 | (c >>> 6 & 0x3f);
          buf[i++] = 0x80 | (c & 0x3f);
        }
      }

      return buf;
    };

    // Helper (used in 2 places)
    function buf2binstring(buf, len) {
      // On Chrome, the arguments in a function call that are allowed is `65534`.
      // If the length of the buffer is smaller than that, we can use this optimization,
      // otherwise we will take a slower path.
      if (len < 65534) {
        if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
          return String.fromCharCode.apply(null, common.shrinkBuf(buf, len));
        }
      }

      var result = '';
      for (var i = 0; i < len; i++) {
        result += String.fromCharCode(buf[i]);
      }
      return result;
    }


    // Convert byte array to binary string
    var buf2binstring_1 = function (buf) {
      return buf2binstring(buf, buf.length);
    };


    // Convert binary string (typed, when possible)
    var binstring2buf = function (str) {
      var buf = new common.Buf8(str.length);
      for (var i = 0, len = buf.length; i < len; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    };


    // convert array to string
    var buf2string = function (buf, max) {
      var i, out, c, c_len;
      var len = max || buf.length;

      // Reserve max possible length (2 words per char)
      // NB: by unknown reasons, Array is significantly faster for
      //     String.fromCharCode.apply than Uint16Array.
      var utf16buf = new Array(len * 2);

      for (out = 0, i = 0; i < len;) {
        c = buf[i++];
        // quick process ascii
        if (c < 0x80) { utf16buf[out++] = c; continue; }

        c_len = _utf8len[c];
        // skip 5 & 6 byte codes
        if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }

        // apply mask on first byte
        c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
        // join the rest
        while (c_len > 1 && i < len) {
          c = (c << 6) | (buf[i++] & 0x3f);
          c_len--;
        }

        // terminated by end of string?
        if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

        if (c < 0x10000) {
          utf16buf[out++] = c;
        } else {
          c -= 0x10000;
          utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
          utf16buf[out++] = 0xdc00 | (c & 0x3ff);
        }
      }

      return buf2binstring(utf16buf, out);
    };


    // Calculate max possible position in utf8 buffer,
    // that will not break sequence. If that's not possible
    // - (very small limits) return max size as is.
    //
    // buf[] - utf8 bytes array
    // max   - length limit (mandatory);
    var utf8border = function (buf, max) {
      var pos;

      max = max || buf.length;
      if (max > buf.length) { max = buf.length; }

      // go back from last position, until start of sequence found
      pos = max - 1;
      while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

      // Very small and broken sequence,
      // return max, because we should return something anyway.
      if (pos < 0) { return max; }

      // If we came to start of buffer - that means buffer is too small,
      // return max too.
      if (pos === 0) { return max; }

      return (pos + _utf8len[buf[pos]] > max) ? pos : max;
    };

    var strings = {
    	string2buf: string2buf,
    	buf2binstring: buf2binstring_1,
    	binstring2buf: binstring2buf,
    	buf2string: buf2string,
    	utf8border: utf8border
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    function ZStream() {
      /* next input byte */
      this.input = null; // JS specific, because we have no pointers
      this.next_in = 0;
      /* number of bytes available at input */
      this.avail_in = 0;
      /* total number of input bytes read so far */
      this.total_in = 0;
      /* next output byte should be put there */
      this.output = null; // JS specific, because we have no pointers
      this.next_out = 0;
      /* remaining free space at output */
      this.avail_out = 0;
      /* total number of bytes output so far */
      this.total_out = 0;
      /* last error message, NULL if no error */
      this.msg = ''/*Z_NULL*/;
      /* not visible by applications */
      this.state = null;
      /* best guess about the data type: binary or text */
      this.data_type = 2/*Z_UNKNOWN*/;
      /* adler32 value of the uncompressed data */
      this.adler = 0;
    }

    var zstream = ZStream;

    var toString = Object.prototype.toString;

    /* Public constants ==========================================================*/
    /* ===========================================================================*/

    var Z_NO_FLUSH$1      = 0;
    var Z_FINISH$1        = 4;

    var Z_OK$1            = 0;
    var Z_STREAM_END$1    = 1;
    var Z_SYNC_FLUSH    = 2;

    var Z_DEFAULT_COMPRESSION$1 = -1;

    var Z_DEFAULT_STRATEGY$1    = 0;

    var Z_DEFLATED$1  = 8;

    /* ===========================================================================*/


    /**
     * class Deflate
     *
     * Generic JS-style wrapper for zlib calls. If you don't need
     * streaming behaviour - use more simple functions: [[deflate]],
     * [[deflateRaw]] and [[gzip]].
     **/

    /* internal
     * Deflate.chunks -> Array
     *
     * Chunks of output data, if [[Deflate#onData]] not overridden.
     **/

    /**
     * Deflate.result -> Uint8Array|Array
     *
     * Compressed result, generated by default [[Deflate#onData]]
     * and [[Deflate#onEnd]] handlers. Filled after you push last chunk
     * (call [[Deflate#push]] with `Z_FINISH` / `true` param)  or if you
     * push a chunk with explicit flush (call [[Deflate#push]] with
     * `Z_SYNC_FLUSH` param).
     **/

    /**
     * Deflate.err -> Number
     *
     * Error code after deflate finished. 0 (Z_OK) on success.
     * You will not need it in real life, because deflate errors
     * are possible only on wrong options or bad `onData` / `onEnd`
     * custom handlers.
     **/

    /**
     * Deflate.msg -> String
     *
     * Error message, if [[Deflate.err]] != 0
     **/


    /**
     * new Deflate(options)
     * - options (Object): zlib deflate options.
     *
     * Creates new deflator instance with specified params. Throws exception
     * on bad params. Supported options:
     *
     * - `level`
     * - `windowBits`
     * - `memLevel`
     * - `strategy`
     * - `dictionary`
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information on these.
     *
     * Additional options, for internal needs:
     *
     * - `chunkSize` - size of generated data chunks (16K by default)
     * - `raw` (Boolean) - do raw deflate
     * - `gzip` (Boolean) - create gzip wrapper
     * - `to` (String) - if equal to 'string', then result will be "binary string"
     *    (each char code [0..255])
     * - `header` (Object) - custom header for gzip
     *   - `text` (Boolean) - true if compressed data believed to be text
     *   - `time` (Number) - modification time, unix timestamp
     *   - `os` (Number) - operation system code
     *   - `extra` (Array) - array of bytes with extra data (max 65536)
     *   - `name` (String) - file name (binary string)
     *   - `comment` (String) - comment (binary string)
     *   - `hcrc` (Boolean) - true if header crc should be added
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
     *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
     *
     * var deflate = new pako.Deflate({ level: 3});
     *
     * deflate.push(chunk1, false);
     * deflate.push(chunk2, true);  // true -> last chunk
     *
     * if (deflate.err) { throw new Error(deflate.err); }
     *
     * console.log(deflate.result);
     * ```
     **/
    function Deflate(options) {
      if (!(this instanceof Deflate)) return new Deflate(options);

      this.options = common.assign({
        level: Z_DEFAULT_COMPRESSION$1,
        method: Z_DEFLATED$1,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY$1,
        to: ''
      }, options || {});

      var opt = this.options;

      if (opt.raw && (opt.windowBits > 0)) {
        opt.windowBits = -opt.windowBits;
      }

      else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
        opt.windowBits += 16;
      }

      this.err    = 0;      // error code, if happens (0 = Z_OK)
      this.msg    = '';     // error message
      this.ended  = false;  // used to avoid multiple onEnd() calls
      this.chunks = [];     // chunks of compressed data

      this.strm = new zstream();
      this.strm.avail_out = 0;

      var status = deflate_1.deflateInit2(
        this.strm,
        opt.level,
        opt.method,
        opt.windowBits,
        opt.memLevel,
        opt.strategy
      );

      if (status !== Z_OK$1) {
        throw new Error(messages[status]);
      }

      if (opt.header) {
        deflate_1.deflateSetHeader(this.strm, opt.header);
      }

      if (opt.dictionary) {
        var dict;
        // Convert data if needed
        if (typeof opt.dictionary === 'string') {
          // If we need to compress text, change encoding to utf8.
          dict = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }

        status = deflate_1.deflateSetDictionary(this.strm, dict);

        if (status !== Z_OK$1) {
          throw new Error(messages[status]);
        }

        this._dict_set = true;
      }
    }

    /**
     * Deflate#push(data[, mode]) -> Boolean
     * - data (Uint8Array|Array|ArrayBuffer|String): input data. Strings will be
     *   converted to utf8 byte sequence.
     * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
     *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
     *
     * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
     * new compressed chunks. Returns `true` on success. The last data block must have
     * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
     * [[Deflate#onEnd]]. For interim explicit flushes (without ending the stream) you
     * can use mode Z_SYNC_FLUSH, keeping the compression context.
     *
     * On fail call [[Deflate#onEnd]] with error code and return false.
     *
     * We strongly recommend to use `Uint8Array` on input for best speed (output
     * array format is detected automatically). Also, don't skip last param and always
     * use the same type in your code (boolean or number). That will improve JS speed.
     *
     * For regular `Array`-s make sure all elements are [0..255].
     *
     * ##### Example
     *
     * ```javascript
     * push(chunk, false); // push one of data chunks
     * ...
     * push(chunk, true);  // push last chunk
     * ```
     **/
    Deflate.prototype.push = function (data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var status, _mode;

      if (this.ended) { return false; }

      _mode = (mode === ~~mode) ? mode : ((mode === true) ? Z_FINISH$1 : Z_NO_FLUSH$1);

      // Convert data if needed
      if (typeof data === 'string') {
        // If we need to compress text, change encoding to utf8.
        strm.input = strings.string2buf(data);
      } else if (toString.call(data) === '[object ArrayBuffer]') {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }

      strm.next_in = 0;
      strm.avail_in = strm.input.length;

      do {
        if (strm.avail_out === 0) {
          strm.output = new common.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = deflate_1.deflate(strm, _mode);    /* no bad return value */

        if (status !== Z_STREAM_END$1 && status !== Z_OK$1) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.avail_out === 0 || (strm.avail_in === 0 && (_mode === Z_FINISH$1 || _mode === Z_SYNC_FLUSH))) {
          if (this.options.to === 'string') {
            this.onData(strings.buf2binstring(common.shrinkBuf(strm.output, strm.next_out)));
          } else {
            this.onData(common.shrinkBuf(strm.output, strm.next_out));
          }
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END$1);

      // Finalize on the last chunk.
      if (_mode === Z_FINISH$1) {
        status = deflate_1.deflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === Z_OK$1;
      }

      // callback interim results if Z_SYNC_FLUSH.
      if (_mode === Z_SYNC_FLUSH) {
        this.onEnd(Z_OK$1);
        strm.avail_out = 0;
        return true;
      }

      return true;
    };


    /**
     * Deflate#onData(chunk) -> Void
     * - chunk (Uint8Array|Array|String): output data. Type of array depends
     *   on js engine support. When string output requested, each chunk
     *   will be string.
     *
     * By default, stores data blocks in `chunks[]` property and glue
     * those in `onEnd`. Override this handler, if you need another behaviour.
     **/
    Deflate.prototype.onData = function (chunk) {
      this.chunks.push(chunk);
    };


    /**
     * Deflate#onEnd(status) -> Void
     * - status (Number): deflate status. 0 (Z_OK) on success,
     *   other if not.
     *
     * Called once after you tell deflate that the input stream is
     * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
     * or if an error happened. By default - join collected chunks,
     * free memory and fill `results` / `err` properties.
     **/
    Deflate.prototype.onEnd = function (status) {
      // On success - join
      if (status === Z_OK$1) {
        if (this.options.to === 'string') {
          this.result = this.chunks.join('');
        } else {
          this.result = common.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };


    /**
     * deflate(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to compress.
     * - options (Object): zlib deflate options.
     *
     * Compress `data` with deflate algorithm and `options`.
     *
     * Supported options are:
     *
     * - level
     * - windowBits
     * - memLevel
     * - strategy
     * - dictionary
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information on these.
     *
     * Sugar (options):
     *
     * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
     *   negative windowBits implicitly.
     * - `to` (String) - if equal to 'string', then result will be "binary string"
     *    (each char code [0..255])
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , data = Uint8Array([1,2,3,4,5,6,7,8,9]);
     *
     * console.log(pako.deflate(data));
     * ```
     **/
    function deflate$1(input, options) {
      var deflator = new Deflate(options);

      deflator.push(input, true);

      // That will never happens, if you don't cheat with options :)
      if (deflator.err) { throw deflator.msg || messages[deflator.err]; }

      return deflator.result;
    }


    /**
     * deflateRaw(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to compress.
     * - options (Object): zlib deflate options.
     *
     * The same as [[deflate]], but creates raw data, without wrapper
     * (header and adler32 crc).
     **/
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate$1(input, options);
    }


    /**
     * gzip(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to compress.
     * - options (Object): zlib deflate options.
     *
     * The same as [[deflate]], but create gzip wrapper instead of
     * deflate one.
     **/
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate$1(input, options);
    }


    var Deflate_1 = Deflate;
    var deflate_2$1 = deflate$1;
    var deflateRaw_1 = deflateRaw;
    var gzip_1 = gzip;

    var deflate_1$1 = {
    	Deflate: Deflate_1,
    	deflate: deflate_2$1,
    	deflateRaw: deflateRaw_1,
    	gzip: gzip_1
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    // See state defs from inflate.js
    var BAD = 30;       /* got a data error -- remain here until reset */
    var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

    /*
       Decode literal, length, and distance codes and write out the resulting
       literal and match bytes until either not enough input or output is
       available, an end-of-block is encountered, or a data error is encountered.
       When large enough input and output buffers are supplied to inflate(), for
       example, a 16K input buffer and a 64K output buffer, more than 95% of the
       inflate execution time is spent in this routine.

       Entry assumptions:

            state.mode === LEN
            strm.avail_in >= 6
            strm.avail_out >= 258
            start >= strm.avail_out
            state.bits < 8

       On return, state.mode is one of:

            LEN -- ran out of enough output space or enough available input
            TYPE -- reached end of block code, inflate() to interpret next block
            BAD -- error in block data

       Notes:

        - The maximum input bits used by a length/distance pair is 15 bits for the
          length code, 5 bits for the length extra, 15 bits for the distance code,
          and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
          Therefore if strm.avail_in >= 6, then there is enough input to avoid
          checking for available input while decoding.

        - The maximum bytes that a single length/distance pair can output is 258
          bytes, which is the maximum length that can be coded.  inflate_fast()
          requires strm.avail_out >= 258 for each loop to avoid checking for
          output space.
     */
    var inffast = function inflate_fast(strm, start) {
      var state;
      var _in;                    /* local strm.input */
      var last;                   /* have enough input while in < last */
      var _out;                   /* local strm.output */
      var beg;                    /* inflate()'s initial strm.output */
      var end;                    /* while out < end, enough space available */
    //#ifdef INFLATE_STRICT
      var dmax;                   /* maximum distance from zlib header */
    //#endif
      var wsize;                  /* window size or zero if not using window */
      var whave;                  /* valid bytes in the window */
      var wnext;                  /* window write index */
      // Use `s_window` instead `window`, avoid conflict with instrumentation tools
      var s_window;               /* allocated sliding window, if wsize != 0 */
      var hold;                   /* local strm.hold */
      var bits;                   /* local strm.bits */
      var lcode;                  /* local strm.lencode */
      var dcode;                  /* local strm.distcode */
      var lmask;                  /* mask for first level of length codes */
      var dmask;                  /* mask for first level of distance codes */
      var here;                   /* retrieved table entry */
      var op;                     /* code bits, operation, extra bits, or */
                                  /*  window position, window bytes to copy */
      var len;                    /* match length, unused bytes */
      var dist;                   /* match distance */
      var from;                   /* where to copy match from */
      var from_source;


      var input, output; // JS specific, because we have no pointers

      /* copy state to local variables */
      state = strm.state;
      //here = state.here;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
    //#ifdef INFLATE_STRICT
      dmax = state.dmax;
    //#endif
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;


      /* decode literals and length/distances until end-of-block or not enough
         input data or output space */

      top:
      do {
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }

        here = lcode[hold & lmask];

        dolen:
        for (;;) { // Goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;
          if (op === 0) {                          /* literal */
            //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
            //        "inflate:         literal '%c'\n" :
            //        "inflate:         literal 0x%02x\n", here.val));
            output[_out++] = here & 0xffff/*here.val*/;
          }
          else if (op & 16) {                     /* length base */
            len = here & 0xffff/*here.val*/;
            op &= 15;                           /* number of extra bits */
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & ((1 << op) - 1);
              hold >>>= op;
              bits -= op;
            }
            //Tracevv((stderr, "inflate:         length %u\n", len));
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];

            dodist:
            for (;;) { // goto emulation
              op = here >>> 24/*here.bits*/;
              hold >>>= op;
              bits -= op;
              op = (here >>> 16) & 0xff/*here.op*/;

              if (op & 16) {                      /* distance base */
                dist = here & 0xffff/*here.val*/;
                op &= 15;                       /* number of extra bits */
                if (bits < op) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                }
                dist += hold & ((1 << op) - 1);
    //#ifdef INFLATE_STRICT
                if (dist > dmax) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }
    //#endif
                hold >>>= op;
                bits -= op;
                //Tracevv((stderr, "inflate:         distance %u\n", dist));
                op = _out - beg;                /* max distance in output */
                if (dist > op) {                /* see if copy from window */
                  op = dist - op;               /* distance back in window */
                  if (op > whave) {
                    if (state.sane) {
                      strm.msg = 'invalid distance too far back';
                      state.mode = BAD;
                      break top;
                    }

    // (!) This block is disabled in zlib defaults,
    // don't enable it for binary compatibility
    //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
    //                if (len <= op - whave) {
    //                  do {
    //                    output[_out++] = 0;
    //                  } while (--len);
    //                  continue top;
    //                }
    //                len -= op - whave;
    //                do {
    //                  output[_out++] = 0;
    //                } while (--op > whave);
    //                if (op === 0) {
    //                  from = _out - dist;
    //                  do {
    //                    output[_out++] = output[from++];
    //                  } while (--len);
    //                  continue top;
    //                }
    //#endif
                  }
                  from = 0; // window index
                  from_source = s_window;
                  if (wnext === 0) {           /* very common case */
                    from += wsize - op;
                    if (op < len) {         /* some from window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = _out - dist;  /* rest from output */
                      from_source = output;
                    }
                  }
                  else if (wnext < op) {      /* wrap around window */
                    from += wsize + wnext - op;
                    op -= wnext;
                    if (op < len) {         /* some from end of window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = 0;
                      if (wnext < len) {  /* some from start of window */
                        op = wnext;
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;      /* rest from output */
                        from_source = output;
                      }
                    }
                  }
                  else {                      /* contiguous in window */
                    from += wnext - op;
                    if (op < len) {         /* some from window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = _out - dist;  /* rest from output */
                      from_source = output;
                    }
                  }
                  while (len > 2) {
                    output[_out++] = from_source[from++];
                    output[_out++] = from_source[from++];
                    output[_out++] = from_source[from++];
                    len -= 3;
                  }
                  if (len) {
                    output[_out++] = from_source[from++];
                    if (len > 1) {
                      output[_out++] = from_source[from++];
                    }
                  }
                }
                else {
                  from = _out - dist;          /* copy direct from output */
                  do {                        /* minimum length is three */
                    output[_out++] = output[from++];
                    output[_out++] = output[from++];
                    output[_out++] = output[from++];
                    len -= 3;
                  } while (len > 2);
                  if (len) {
                    output[_out++] = output[from++];
                    if (len > 1) {
                      output[_out++] = output[from++];
                    }
                  }
                }
              }
              else if ((op & 64) === 0) {          /* 2nd level distance code */
                here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
                continue dodist;
              }
              else {
                strm.msg = 'invalid distance code';
                state.mode = BAD;
                break top;
              }

              break; // need to emulate goto via "continue"
            }
          }
          else if ((op & 64) === 0) {              /* 2nd level length code */
            here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dolen;
          }
          else if (op & 32) {                     /* end-of-block */
            //Tracevv((stderr, "inflate:         end of block\n"));
            state.mode = TYPE;
            break top;
          }
          else {
            strm.msg = 'invalid literal/length code';
            state.mode = BAD;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      } while (_in < last && _out < end);

      /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;

      /* update state and return */
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
      strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
      state.hold = hold;
      state.bits = bits;
      return;
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.



    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    //var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;

    var lbase = [ /* Length codes 257..285 base */
      3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
      35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
    ];

    var lext = [ /* Length codes 257..285 extra */
      16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
      19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
    ];

    var dbase = [ /* Distance codes 0..29 base */
      1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
      257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
      8193, 12289, 16385, 24577, 0, 0
    ];

    var dext = [ /* Distance codes 0..29 extra */
      16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
      23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
      28, 28, 29, 29, 64, 64
    ];

    var inftrees = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
    {
      var bits = opts.bits;
          //here = opts.here; /* table entry for duplication */

      var len = 0;               /* a code's length in bits */
      var sym = 0;               /* index of code symbols */
      var min = 0, max = 0;          /* minimum and maximum code lengths */
      var root = 0;              /* number of index bits for root table */
      var curr = 0;              /* number of index bits for current table */
      var drop = 0;              /* code bits to drop for sub-table */
      var left = 0;                   /* number of prefix codes available */
      var used = 0;              /* code entries in table used */
      var huff = 0;              /* Huffman code */
      var incr;              /* for incrementing code, index */
      var fill;              /* index for replicating entries */
      var low;               /* low bits for current root entry */
      var mask;              /* mask for low root bits */
      var next;             /* next available space in table */
      var base = null;     /* base value table to use */
      var base_index = 0;
    //  var shoextra;    /* extra bits table to use */
      var end;                    /* use base and extra for symbol > end */
      var count = new common.Buf16(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */
      var offs = new common.Buf16(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */
      var extra = null;
      var extra_index = 0;

      var here_bits, here_op, here_val;

      /*
       Process a set of code lengths to create a canonical Huffman code.  The
       code lengths are lens[0..codes-1].  Each length corresponds to the
       symbols 0..codes-1.  The Huffman code is generated by first sorting the
       symbols by length from short to long, and retaining the symbol order
       for codes with equal lengths.  Then the code starts with all zero bits
       for the first code of the shortest length, and the codes are integer
       increments for the same length, and zeros are appended as the length
       increases.  For the deflate format, these bits are stored backwards
       from their more natural integer increment ordering, and so when the
       decoding tables are built in the large loop below, the integer codes
       are incremented backwards.

       This routine assumes, but does not check, that all of the entries in
       lens[] are in the range 0..MAXBITS.  The caller must assure this.
       1..MAXBITS is interpreted as that code length.  zero means that that
       symbol does not occur in this code.

       The codes are sorted by computing a count of codes for each length,
       creating from that a table of starting indices for each length in the
       sorted table, and then entering the symbols in order in the sorted
       table.  The sorted table is work[], with that space being provided by
       the caller.

       The length counts are used for other purposes as well, i.e. finding
       the minimum and maximum length codes, determining if there are any
       codes at all, checking for a valid set of lengths, and looking ahead
       at length counts to determine sub-table sizes when building the
       decoding tables.
       */

      /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }

      /* bound code lengths, force root to be within code lengths */
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) { break; }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) {                     /* no symbols to code at all */
        //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
        //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
        //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;


        //table.op[opts.table_index] = 64;
        //table.bits[opts.table_index] = 1;
        //table.val[opts.table_index++] = 0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;

        opts.bits = 1;
        return 0;     /* no symbols, but wait for decoding to report error */
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) { break; }
      }
      if (root < min) {
        root = min;
      }

      /* check for an over-subscribed or incomplete set of lengths */
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }        /* over-subscribed */
      }
      if (left > 0 && (type === CODES || max !== 1)) {
        return -1;                      /* incomplete set */
      }

      /* generate offsets into symbol table for each length for sorting */
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }

      /* sort symbols by length, by symbol order within each length */
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }

      /*
       Create and fill in decoding tables.  In this loop, the table being
       filled is at next and has curr index bits.  The code being used is huff
       with length len.  That code is converted to an index by dropping drop
       bits off of the bottom.  For codes where len is less than drop + curr,
       those top drop + curr - len bits are incremented through all values to
       fill the table with replicated entries.

       root is the number of index bits for the root table.  When len exceeds
       root, sub-tables are created pointed to by the root entry with an index
       of the low root bits of huff.  This is saved in low to check for when a
       new sub-table should be started.  drop is zero when the root table is
       being filled, and drop is root when sub-tables are being filled.

       When a new sub-table is needed, it is necessary to look ahead in the
       code lengths to determine what size sub-table is needed.  The length
       counts are used for this, and so count[] is decremented as codes are
       entered in the tables.

       used keeps track of how many table entries have been allocated from the
       provided *table space.  It is checked for LENS and DIST tables against
       the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
       the initial root table size constants.  See the comments in inftrees.h
       for more information.

       sym increments through all symbols, and the loop terminates when
       all codes of length max, i.e. all codes, have been processed.  This
       routine permits incomplete codes, so another loop after this one fills
       in the rest of the decoding tables with invalid code markers.
       */

      /* set up for code type */
      // poor man optimization - use if-else instead of switch,
      // to avoid deopts in old v8
      if (type === CODES) {
        base = extra = work;    /* dummy value--not used */
        end = 19;

      } else if (type === LENS) {
        base = lbase;
        base_index -= 257;
        extra = lext;
        extra_index -= 257;
        end = 256;

      } else {                    /* DISTS */
        base = dbase;
        extra = dext;
        end = -1;
      }

      /* initialize opts for loop */
      huff = 0;                   /* starting code */
      sym = 0;                    /* starting code symbol */
      len = min;                  /* starting code length */
      next = table_index;              /* current table to fill in */
      curr = root;                /* current table index bits */
      drop = 0;                   /* current bits to drop from code for index */
      low = -1;                   /* trigger new sub-table when len > root */
      used = 1 << root;          /* use root table entries */
      mask = used - 1;            /* mask for comparing low */

      /* check available table space */
      if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
      }

      /* process all codes and make table entries */
      for (;;) {
        /* create table entry */
        here_bits = len - drop;
        if (work[sym] < end) {
          here_op = 0;
          here_val = work[sym];
        }
        else if (work[sym] > end) {
          here_op = extra[extra_index + work[sym]];
          here_val = base[base_index + work[sym]];
        }
        else {
          here_op = 32 + 64;         /* end of block */
          here_val = 0;
        }

        /* replicate for those indices with low len bits equal to huff */
        incr = 1 << (len - drop);
        fill = 1 << curr;
        min = fill;                 /* save offset to next table */
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
        } while (fill !== 0);

        /* backwards increment the len-bit code huff */
        incr = 1 << (len - 1);
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }

        /* go to next symbol, update count, len */
        sym++;
        if (--count[len] === 0) {
          if (len === max) { break; }
          len = lens[lens_index + work[sym]];
        }

        /* create new sub-table if needed */
        if (len > root && (huff & mask) !== low) {
          /* if first time, transition to sub-tables */
          if (drop === 0) {
            drop = root;
          }

          /* increment past last table */
          next += min;            /* here min is 1 << curr */

          /* determine length of next table */
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) { break; }
            curr++;
            left <<= 1;
          }

          /* check for enough space */
          used += 1 << curr;
          if ((type === LENS && used > ENOUGH_LENS) ||
            (type === DISTS && used > ENOUGH_DISTS)) {
            return 1;
          }

          /* point entry in root table to sub-table */
          low = huff & mask;
          /*table.op[low] = curr;
          table.bits[low] = root;
          table.val[low] = next - opts.table_index;*/
          table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
        }
      }

      /* fill in remaining table entry if code is incomplete (guaranteed to have
       at most one remaining entry, since if the code is incomplete, the
       maximum code length that was allowed to get this far is one bit) */
      if (huff !== 0) {
        //table.op[next + huff] = 64;            /* invalid code marker */
        //table.bits[next + huff] = len - drop;
        //table.val[next + huff] = 0;
        table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
      }

      /* set return parameters */
      //opts.table_index += used;
      opts.bits = root;
      return 0;
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.







    var CODES$1 = 0;
    var LENS$1 = 1;
    var DISTS$1 = 2;

    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    /* Allowed flush values; see deflate() and inflate() below for details */
    //var Z_NO_FLUSH      = 0;
    //var Z_PARTIAL_FLUSH = 1;
    //var Z_SYNC_FLUSH    = 2;
    //var Z_FULL_FLUSH    = 3;
    var Z_FINISH$2        = 4;
    var Z_BLOCK$1         = 5;
    var Z_TREES         = 6;


    /* Return codes for the compression/decompression functions. Negative values
     * are errors, positive values are used for special but normal events.
     */
    var Z_OK$2            = 0;
    var Z_STREAM_END$2    = 1;
    var Z_NEED_DICT     = 2;
    //var Z_ERRNO         = -1;
    var Z_STREAM_ERROR$1  = -2;
    var Z_DATA_ERROR$1    = -3;
    var Z_MEM_ERROR     = -4;
    var Z_BUF_ERROR$1     = -5;
    //var Z_VERSION_ERROR = -6;

    /* The deflate compression method */
    var Z_DEFLATED$2  = 8;


    /* STATES ====================================================================*/
    /* ===========================================================================*/


    var    HEAD = 1;       /* i: waiting for magic header */
    var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
    var    TIME = 3;       /* i: waiting for modification time (gzip) */
    var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
    var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
    var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
    var    NAME = 7;       /* i: waiting for end of file name (gzip) */
    var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
    var    HCRC = 9;       /* i: waiting for header crc (gzip) */
    var    DICTID = 10;    /* i: waiting for dictionary check value */
    var    DICT = 11;      /* waiting for inflateSetDictionary() call */
    var        TYPE$1 = 12;      /* i: waiting for type bits, including last-flag bit */
    var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
    var        STORED = 14;    /* i: waiting for stored size (length and complement) */
    var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
    var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
    var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
    var        LENLENS = 18;   /* i: waiting for code length code lengths */
    var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
    var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
    var            LEN = 21;       /* i: waiting for length/lit/eob code */
    var            LENEXT = 22;    /* i: waiting for length extra bits */
    var            DIST = 23;      /* i: waiting for distance code */
    var            DISTEXT = 24;   /* i: waiting for distance extra bits */
    var            MATCH = 25;     /* o: waiting for output space to copy string */
    var            LIT = 26;       /* o: waiting for output space to write literal */
    var    CHECK = 27;     /* i: waiting for 32-bit check value */
    var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
    var    DONE = 29;      /* finished check, done -- remain here until reset */
    var    BAD$1 = 30;       /* got a data error -- remain here until reset */
    var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
    var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

    /* ===========================================================================*/



    var ENOUGH_LENS$1 = 852;
    var ENOUGH_DISTS$1 = 592;
    //var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

    var MAX_WBITS$1 = 15;
    /* 32K LZ77 window */
    var DEF_WBITS = MAX_WBITS$1;


    function zswap32(q) {
      return  (((q >>> 24) & 0xff) +
              ((q >>> 8) & 0xff00) +
              ((q & 0xff00) << 8) +
              ((q & 0xff) << 24));
    }


    function InflateState() {
      this.mode = 0;             /* current inflate mode */
      this.last = false;          /* true if processing last block */
      this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
      this.havedict = false;      /* true if dictionary provided */
      this.flags = 0;             /* gzip header method and flags (0 if zlib) */
      this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
      this.check = 0;             /* protected copy of check value */
      this.total = 0;             /* protected copy of output count */
      // TODO: may be {}
      this.head = null;           /* where to save gzip header information */

      /* sliding window */
      this.wbits = 0;             /* log base 2 of requested window size */
      this.wsize = 0;             /* window size or zero if not using window */
      this.whave = 0;             /* valid bytes in the window */
      this.wnext = 0;             /* window write index */
      this.window = null;         /* allocated sliding window, if needed */

      /* bit accumulator */
      this.hold = 0;              /* input bit accumulator */
      this.bits = 0;              /* number of bits in "in" */

      /* for string and stored block copying */
      this.length = 0;            /* literal or length of data to copy */
      this.offset = 0;            /* distance back to copy string from */

      /* for table and code decoding */
      this.extra = 0;             /* extra bits needed */

      /* fixed and dynamic code tables */
      this.lencode = null;          /* starting table for length/literal codes */
      this.distcode = null;         /* starting table for distance codes */
      this.lenbits = 0;           /* index bits for lencode */
      this.distbits = 0;          /* index bits for distcode */

      /* dynamic table building */
      this.ncode = 0;             /* number of code length code lengths */
      this.nlen = 0;              /* number of length code lengths */
      this.ndist = 0;             /* number of distance code lengths */
      this.have = 0;              /* number of code lengths in lens[] */
      this.next = null;              /* next available space in codes[] */

      this.lens = new common.Buf16(320); /* temporary storage for code lengths */
      this.work = new common.Buf16(288); /* work area for code table building */

      /*
       because we don't have pointers in js, we use lencode and distcode directly
       as buffers so we don't need codes
      */
      //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
      this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
      this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
      this.sane = 0;                   /* if false, allow invalid distance too far */
      this.back = 0;                   /* bits back of last unprocessed length/lit */
      this.was = 0;                    /* initial length of match */
    }

    function inflateResetKeep(strm) {
      var state;

      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = ''; /*Z_NULL*/
      if (state.wrap) {       /* to support ill-conceived Java test suite */
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.dmax = 32768;
      state.head = null/*Z_NULL*/;
      state.hold = 0;
      state.bits = 0;
      //state.lencode = state.distcode = state.next = state.codes;
      state.lencode = state.lendyn = new common.Buf32(ENOUGH_LENS$1);
      state.distcode = state.distdyn = new common.Buf32(ENOUGH_DISTS$1);

      state.sane = 1;
      state.back = -1;
      //Tracev((stderr, "inflate: reset\n"));
      return Z_OK$2;
    }

    function inflateReset(strm) {
      var state;

      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);

    }

    function inflateReset2(strm, windowBits) {
      var wrap;
      var state;

      /* get the state */
      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;

      /* extract wrap request from windowBits parameter */
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      }
      else {
        wrap = (windowBits >> 4) + 1;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }

      /* set number of window bits, free window if different */
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR$1;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }

      /* update state and reset the rest of it */
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    }

    function inflateInit2(strm, windowBits) {
      var ret;
      var state;

      if (!strm) { return Z_STREAM_ERROR$1; }
      //strm.msg = Z_NULL;                 /* in case we return an error */

      state = new InflateState();

      //if (state === Z_NULL) return Z_MEM_ERROR;
      //Tracev((stderr, "inflate: allocated\n"));
      strm.state = state;
      state.window = null/*Z_NULL*/;
      ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK$2) {
        strm.state = null/*Z_NULL*/;
      }
      return ret;
    }

    function inflateInit(strm) {
      return inflateInit2(strm, DEF_WBITS);
    }


    /*
     Return state with length and distance decoding tables and index sizes set to
     fixed code decoding.  Normally this returns fixed tables from inffixed.h.
     If BUILDFIXED is defined, then instead this routine builds the tables the
     first time it's called, and returns those tables the first time and
     thereafter.  This reduces the size of the code by about 2K bytes, in
     exchange for a little execution time.  However, BUILDFIXED should not be
     used for threaded applications, since the rewriting of the tables and virgin
     may not be thread-safe.
     */
    var virgin = true;

    var lenfix, distfix; // We have no pointers in JS, so keep tables separate

    function fixedtables(state) {
      /* build fixed huffman tables if first call (may not be thread safe) */
      if (virgin) {
        var sym;

        lenfix = new common.Buf32(512);
        distfix = new common.Buf32(32);

        /* literal/length table */
        sym = 0;
        while (sym < 144) { state.lens[sym++] = 8; }
        while (sym < 256) { state.lens[sym++] = 9; }
        while (sym < 280) { state.lens[sym++] = 7; }
        while (sym < 288) { state.lens[sym++] = 8; }

        inftrees(LENS$1,  state.lens, 0, 288, lenfix,   0, state.work, { bits: 9 });

        /* distance table */
        sym = 0;
        while (sym < 32) { state.lens[sym++] = 5; }

        inftrees(DISTS$1, state.lens, 0, 32,   distfix, 0, state.work, { bits: 5 });

        /* do this just once */
        virgin = false;
      }

      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    }


    /*
     Update the window with the last wsize (normally 32K) bytes written before
     returning.  If window does not exist yet, create it.  This is only called
     when a window is already in use, or when output has been written during this
     inflate call, but the end of the deflate stream has not been reached yet.
     It is also called to create a window for dictionary data when a dictionary
     is loaded.

     Providing output buffers larger than 32K to inflate() should provide a speed
     advantage, since only the last 32K of output is copied to the sliding window
     upon return from inflate(), and since all distances after the first 32K of
     output will fall in the output data, making match copies simpler and faster.
     The advantage may be dependent on the size of the processor's data caches.
     */
    function updatewindow(strm, src, end, copy) {
      var dist;
      var state = strm.state;

      /* if it hasn't been done already, allocate space for the window */
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;

        state.window = new common.Buf8(state.wsize);
      }

      /* copy state->wsize or less output bytes into the circular window */
      if (copy >= state.wsize) {
        common.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
        state.wnext = 0;
        state.whave = state.wsize;
      }
      else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        //zmemcpy(state->window + state->wnext, end - copy, dist);
        common.arraySet(state.window, src, end - copy, dist, state.wnext);
        copy -= dist;
        if (copy) {
          //zmemcpy(state->window, end - copy, copy);
          common.arraySet(state.window, src, end - copy, copy, 0);
          state.wnext = copy;
          state.whave = state.wsize;
        }
        else {
          state.wnext += dist;
          if (state.wnext === state.wsize) { state.wnext = 0; }
          if (state.whave < state.wsize) { state.whave += dist; }
        }
      }
      return 0;
    }

    function inflate(strm, flush) {
      var state;
      var input, output;          // input/output buffers
      var next;                   /* next input INDEX */
      var put;                    /* next output INDEX */
      var have, left;             /* available input and output */
      var hold;                   /* bit buffer */
      var bits;                   /* bits in bit buffer */
      var _in, _out;              /* save starting available input and output */
      var copy;                   /* number of stored or match bytes to copy */
      var from;                   /* where to copy match bytes from */
      var from_source;
      var here = 0;               /* current decoding table entry */
      var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
      //var last;                   /* parent table entry */
      var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
      var len;                    /* length to copy for repeats, bits to drop */
      var ret;                    /* return code */
      var hbuf = new common.Buf8(4);    /* buffer for gzip header crc calculation */
      var opts;

      var n; // temporary var for NEED_BITS

      var order = /* permutation of code lengths */
        [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];


      if (!strm || !strm.state || !strm.output ||
          (!strm.input && strm.avail_in !== 0)) {
        return Z_STREAM_ERROR$1;
      }

      state = strm.state;
      if (state.mode === TYPE$1) { state.mode = TYPEDO; }    /* skip check */


      //--- LOAD() ---
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      //---

      _in = have;
      _out = left;
      ret = Z_OK$2;

      inf_leave: // goto emulation
      for (;;) {
        switch (state.mode) {
          case HEAD:
            if (state.wrap === 0) {
              state.mode = TYPEDO;
              break;
            }
            //=== NEEDBITS(16);
            while (bits < 16) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
              state.check = 0/*crc32(0L, Z_NULL, 0)*/;
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32_1(state.check, hbuf, 2, 0);
              //===//

              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              state.mode = FLAGS;
              break;
            }
            state.flags = 0;           /* expect zlib header */
            if (state.head) {
              state.head.done = false;
            }
            if (!(state.wrap & 1) ||   /* check if zlib header allowed */
              (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
              strm.msg = 'incorrect header check';
              state.mode = BAD$1;
              break;
            }
            if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED$2) {
              strm.msg = 'unknown compression method';
              state.mode = BAD$1;
              break;
            }
            //--- DROPBITS(4) ---//
            hold >>>= 4;
            bits -= 4;
            //---//
            len = (hold & 0x0f)/*BITS(4)*/ + 8;
            if (state.wbits === 0) {
              state.wbits = len;
            }
            else if (len > state.wbits) {
              strm.msg = 'invalid window size';
              state.mode = BAD$1;
              break;
            }
            state.dmax = 1 << len;
            //Tracev((stderr, "inflate:   zlib header ok\n"));
            strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
            state.mode = hold & 0x200 ? DICTID : TYPE$1;
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            break;
          case FLAGS:
            //=== NEEDBITS(16); */
            while (bits < 16) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.flags = hold;
            if ((state.flags & 0xff) !== Z_DEFLATED$2) {
              strm.msg = 'unknown compression method';
              state.mode = BAD$1;
              break;
            }
            if (state.flags & 0xe000) {
              strm.msg = 'unknown header flags set';
              state.mode = BAD$1;
              break;
            }
            if (state.head) {
              state.head.text = ((hold >> 8) & 1);
            }
            if (state.flags & 0x0200) {
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32_1(state.check, hbuf, 2, 0);
              //===//
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = TIME;
            /* falls through */
          case TIME:
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if (state.head) {
              state.head.time = hold;
            }
            if (state.flags & 0x0200) {
              //=== CRC4(state.check, hold)
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              hbuf[2] = (hold >>> 16) & 0xff;
              hbuf[3] = (hold >>> 24) & 0xff;
              state.check = crc32_1(state.check, hbuf, 4, 0);
              //===
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = OS;
            /* falls through */
          case OS:
            //=== NEEDBITS(16); */
            while (bits < 16) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if (state.head) {
              state.head.xflags = (hold & 0xff);
              state.head.os = (hold >> 8);
            }
            if (state.flags & 0x0200) {
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32_1(state.check, hbuf, 2, 0);
              //===//
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = EXLEN;
            /* falls through */
          case EXLEN:
            if (state.flags & 0x0400) {
              //=== NEEDBITS(16); */
              while (bits < 16) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.length = hold;
              if (state.head) {
                state.head.extra_len = hold;
              }
              if (state.flags & 0x0200) {
                //=== CRC2(state.check, hold);
                hbuf[0] = hold & 0xff;
                hbuf[1] = (hold >>> 8) & 0xff;
                state.check = crc32_1(state.check, hbuf, 2, 0);
                //===//
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
            }
            else if (state.head) {
              state.head.extra = null/*Z_NULL*/;
            }
            state.mode = EXTRA;
            /* falls through */
          case EXTRA:
            if (state.flags & 0x0400) {
              copy = state.length;
              if (copy > have) { copy = have; }
              if (copy) {
                if (state.head) {
                  len = state.head.extra_len - state.length;
                  if (!state.head.extra) {
                    // Use untyped array for more convenient processing later
                    state.head.extra = new Array(state.head.extra_len);
                  }
                  common.arraySet(
                    state.head.extra,
                    input,
                    next,
                    // extra field is limited to 65536 bytes
                    // - no need for additional size check
                    copy,
                    /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                    len
                  );
                  //zmemcpy(state.head.extra + len, next,
                  //        len + copy > state.head.extra_max ?
                  //        state.head.extra_max - len : copy);
                }
                if (state.flags & 0x0200) {
                  state.check = crc32_1(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                state.length -= copy;
              }
              if (state.length) { break inf_leave; }
            }
            state.length = 0;
            state.mode = NAME;
            /* falls through */
          case NAME:
            if (state.flags & 0x0800) {
              if (have === 0) { break inf_leave; }
              copy = 0;
              do {
                // TODO: 2 or 1 bytes?
                len = input[next + copy++];
                /* use constant limit because in js we should not preallocate memory */
                if (state.head && len &&
                    (state.length < 65536 /*state.head.name_max*/)) {
                  state.head.name += String.fromCharCode(len);
                }
              } while (len && copy < have);

              if (state.flags & 0x0200) {
                state.check = crc32_1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) { break inf_leave; }
            }
            else if (state.head) {
              state.head.name = null;
            }
            state.length = 0;
            state.mode = COMMENT;
            /* falls through */
          case COMMENT:
            if (state.flags & 0x1000) {
              if (have === 0) { break inf_leave; }
              copy = 0;
              do {
                len = input[next + copy++];
                /* use constant limit because in js we should not preallocate memory */
                if (state.head && len &&
                    (state.length < 65536 /*state.head.comm_max*/)) {
                  state.head.comment += String.fromCharCode(len);
                }
              } while (len && copy < have);
              if (state.flags & 0x0200) {
                state.check = crc32_1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) { break inf_leave; }
            }
            else if (state.head) {
              state.head.comment = null;
            }
            state.mode = HCRC;
            /* falls through */
          case HCRC:
            if (state.flags & 0x0200) {
              //=== NEEDBITS(16); */
              while (bits < 16) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              if (hold !== (state.check & 0xffff)) {
                strm.msg = 'header crc mismatch';
                state.mode = BAD$1;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
            }
            if (state.head) {
              state.head.hcrc = ((state.flags >> 9) & 1);
              state.head.done = true;
            }
            strm.adler = state.check = 0;
            state.mode = TYPE$1;
            break;
          case DICTID:
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            strm.adler = state.check = zswap32(hold);
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = DICT;
            /* falls through */
          case DICT:
            if (state.havedict === 0) {
              //--- RESTORE() ---
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              //---
              return Z_NEED_DICT;
            }
            strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
            state.mode = TYPE$1;
            /* falls through */
          case TYPE$1:
            if (flush === Z_BLOCK$1 || flush === Z_TREES) { break inf_leave; }
            /* falls through */
          case TYPEDO:
            if (state.last) {
              //--- BYTEBITS() ---//
              hold >>>= bits & 7;
              bits -= bits & 7;
              //---//
              state.mode = CHECK;
              break;
            }
            //=== NEEDBITS(3); */
            while (bits < 3) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.last = (hold & 0x01)/*BITS(1)*/;
            //--- DROPBITS(1) ---//
            hold >>>= 1;
            bits -= 1;
            //---//

            switch ((hold & 0x03)/*BITS(2)*/) {
              case 0:                             /* stored block */
                //Tracev((stderr, "inflate:     stored block%s\n",
                //        state.last ? " (last)" : ""));
                state.mode = STORED;
                break;
              case 1:                             /* fixed block */
                fixedtables(state);
                //Tracev((stderr, "inflate:     fixed codes block%s\n",
                //        state.last ? " (last)" : ""));
                state.mode = LEN_;             /* decode codes */
                if (flush === Z_TREES) {
                  //--- DROPBITS(2) ---//
                  hold >>>= 2;
                  bits -= 2;
                  //---//
                  break inf_leave;
                }
                break;
              case 2:                             /* dynamic block */
                //Tracev((stderr, "inflate:     dynamic codes block%s\n",
                //        state.last ? " (last)" : ""));
                state.mode = TABLE;
                break;
              case 3:
                strm.msg = 'invalid block type';
                state.mode = BAD$1;
            }
            //--- DROPBITS(2) ---//
            hold >>>= 2;
            bits -= 2;
            //---//
            break;
          case STORED:
            //--- BYTEBITS() ---// /* go to byte boundary */
            hold >>>= bits & 7;
            bits -= bits & 7;
            //---//
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
              strm.msg = 'invalid stored block lengths';
              state.mode = BAD$1;
              break;
            }
            state.length = hold & 0xffff;
            //Tracev((stderr, "inflate:       stored length %u\n",
            //        state.length));
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = COPY_;
            if (flush === Z_TREES) { break inf_leave; }
            /* falls through */
          case COPY_:
            state.mode = COPY;
            /* falls through */
          case COPY:
            copy = state.length;
            if (copy) {
              if (copy > have) { copy = have; }
              if (copy > left) { copy = left; }
              if (copy === 0) { break inf_leave; }
              //--- zmemcpy(put, next, copy); ---
              common.arraySet(output, input, next, copy, put);
              //---//
              have -= copy;
              next += copy;
              left -= copy;
              put += copy;
              state.length -= copy;
              break;
            }
            //Tracev((stderr, "inflate:       stored end\n"));
            state.mode = TYPE$1;
            break;
          case TABLE:
            //=== NEEDBITS(14); */
            while (bits < 14) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
            //--- DROPBITS(5) ---//
            hold >>>= 5;
            bits -= 5;
            //---//
            state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
            //--- DROPBITS(5) ---//
            hold >>>= 5;
            bits -= 5;
            //---//
            state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
            //--- DROPBITS(4) ---//
            hold >>>= 4;
            bits -= 4;
            //---//
    //#ifndef PKZIP_BUG_WORKAROUND
            if (state.nlen > 286 || state.ndist > 30) {
              strm.msg = 'too many length or distance symbols';
              state.mode = BAD$1;
              break;
            }
    //#endif
            //Tracev((stderr, "inflate:       table sizes ok\n"));
            state.have = 0;
            state.mode = LENLENS;
            /* falls through */
          case LENLENS:
            while (state.have < state.ncode) {
              //=== NEEDBITS(3);
              while (bits < 3) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
              //--- DROPBITS(3) ---//
              hold >>>= 3;
              bits -= 3;
              //---//
            }
            while (state.have < 19) {
              state.lens[order[state.have++]] = 0;
            }
            // We have separate tables & no pointers. 2 commented lines below not needed.
            //state.next = state.codes;
            //state.lencode = state.next;
            // Switch to use dynamic table
            state.lencode = state.lendyn;
            state.lenbits = 7;

            opts = { bits: state.lenbits };
            ret = inftrees(CODES$1, state.lens, 0, 19, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;

            if (ret) {
              strm.msg = 'invalid code lengths set';
              state.mode = BAD$1;
              break;
            }
            //Tracev((stderr, "inflate:       code lengths ok\n"));
            state.have = 0;
            state.mode = CODELENS;
            /* falls through */
          case CODELENS:
            while (state.have < state.nlen + state.ndist) {
              for (;;) {
                here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((here_bits) <= bits) { break; }
                //--- PULLBYTE() ---//
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              if (here_val < 16) {
                //--- DROPBITS(here.bits) ---//
                hold >>>= here_bits;
                bits -= here_bits;
                //---//
                state.lens[state.have++] = here_val;
              }
              else {
                if (here_val === 16) {
                  //=== NEEDBITS(here.bits + 2);
                  n = here_bits + 2;
                  while (bits < n) {
                    if (have === 0) { break inf_leave; }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  if (state.have === 0) {
                    strm.msg = 'invalid bit length repeat';
                    state.mode = BAD$1;
                    break;
                  }
                  len = state.lens[state.have - 1];
                  copy = 3 + (hold & 0x03);//BITS(2);
                  //--- DROPBITS(2) ---//
                  hold >>>= 2;
                  bits -= 2;
                  //---//
                }
                else if (here_val === 17) {
                  //=== NEEDBITS(here.bits + 3);
                  n = here_bits + 3;
                  while (bits < n) {
                    if (have === 0) { break inf_leave; }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  len = 0;
                  copy = 3 + (hold & 0x07);//BITS(3);
                  //--- DROPBITS(3) ---//
                  hold >>>= 3;
                  bits -= 3;
                  //---//
                }
                else {
                  //=== NEEDBITS(here.bits + 7);
                  n = here_bits + 7;
                  while (bits < n) {
                    if (have === 0) { break inf_leave; }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  len = 0;
                  copy = 11 + (hold & 0x7f);//BITS(7);
                  //--- DROPBITS(7) ---//
                  hold >>>= 7;
                  bits -= 7;
                  //---//
                }
                if (state.have + copy > state.nlen + state.ndist) {
                  strm.msg = 'invalid bit length repeat';
                  state.mode = BAD$1;
                  break;
                }
                while (copy--) {
                  state.lens[state.have++] = len;
                }
              }
            }

            /* handle error breaks in while */
            if (state.mode === BAD$1) { break; }

            /* check for end-of-block code (better have one) */
            if (state.lens[256] === 0) {
              strm.msg = 'invalid code -- missing end-of-block';
              state.mode = BAD$1;
              break;
            }

            /* build code tables -- note: do not change the lenbits or distbits
               values here (9 and 6) without reading the comments in inftrees.h
               concerning the ENOUGH constants, which depend on those values */
            state.lenbits = 9;

            opts = { bits: state.lenbits };
            ret = inftrees(LENS$1, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
            // We have separate tables & no pointers. 2 commented lines below not needed.
            // state.next_index = opts.table_index;
            state.lenbits = opts.bits;
            // state.lencode = state.next;

            if (ret) {
              strm.msg = 'invalid literal/lengths set';
              state.mode = BAD$1;
              break;
            }

            state.distbits = 6;
            //state.distcode.copy(state.codes);
            // Switch to use dynamic table
            state.distcode = state.distdyn;
            opts = { bits: state.distbits };
            ret = inftrees(DISTS$1, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
            // We have separate tables & no pointers. 2 commented lines below not needed.
            // state.next_index = opts.table_index;
            state.distbits = opts.bits;
            // state.distcode = state.next;

            if (ret) {
              strm.msg = 'invalid distances set';
              state.mode = BAD$1;
              break;
            }
            //Tracev((stderr, 'inflate:       codes ok\n'));
            state.mode = LEN_;
            if (flush === Z_TREES) { break inf_leave; }
            /* falls through */
          case LEN_:
            state.mode = LEN;
            /* falls through */
          case LEN:
            if (have >= 6 && left >= 258) {
              //--- RESTORE() ---
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              //---
              inffast(strm, _out);
              //--- LOAD() ---
              put = strm.next_out;
              output = strm.output;
              left = strm.avail_out;
              next = strm.next_in;
              input = strm.input;
              have = strm.avail_in;
              hold = state.hold;
              bits = state.bits;
              //---

              if (state.mode === TYPE$1) {
                state.back = -1;
              }
              break;
            }
            state.back = 0;
            for (;;) {
              here = state.lencode[hold & ((1 << state.lenbits) - 1)];  /*BITS(state.lenbits)*/
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if (here_bits <= bits) { break; }
              //--- PULLBYTE() ---//
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
              //---//
            }
            if (here_op && (here_op & 0xf0) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;;) {
                here = state.lencode[last_val +
                        ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((last_bits + here_bits) <= bits) { break; }
                //--- PULLBYTE() ---//
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              //--- DROPBITS(last.bits) ---//
              hold >>>= last_bits;
              bits -= last_bits;
              //---//
              state.back += last_bits;
            }
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.back += here_bits;
            state.length = here_val;
            if (here_op === 0) {
              //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
              //        "inflate:         literal '%c'\n" :
              //        "inflate:         literal 0x%02x\n", here.val));
              state.mode = LIT;
              break;
            }
            if (here_op & 32) {
              //Tracevv((stderr, "inflate:         end of block\n"));
              state.back = -1;
              state.mode = TYPE$1;
              break;
            }
            if (here_op & 64) {
              strm.msg = 'invalid literal/length code';
              state.mode = BAD$1;
              break;
            }
            state.extra = here_op & 15;
            state.mode = LENEXT;
            /* falls through */
          case LENEXT:
            if (state.extra) {
              //=== NEEDBITS(state.extra);
              n = state.extra;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.length += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
              //--- DROPBITS(state.extra) ---//
              hold >>>= state.extra;
              bits -= state.extra;
              //---//
              state.back += state.extra;
            }
            //Tracevv((stderr, "inflate:         length %u\n", state.length));
            state.was = state.length;
            state.mode = DIST;
            /* falls through */
          case DIST:
            for (;;) {
              here = state.distcode[hold & ((1 << state.distbits) - 1)];/*BITS(state.distbits)*/
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if ((here_bits) <= bits) { break; }
              //--- PULLBYTE() ---//
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
              //---//
            }
            if ((here_op & 0xf0) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;;) {
                here = state.distcode[last_val +
                        ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((last_bits + here_bits) <= bits) { break; }
                //--- PULLBYTE() ---//
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              //--- DROPBITS(last.bits) ---//
              hold >>>= last_bits;
              bits -= last_bits;
              //---//
              state.back += last_bits;
            }
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.back += here_bits;
            if (here_op & 64) {
              strm.msg = 'invalid distance code';
              state.mode = BAD$1;
              break;
            }
            state.offset = here_val;
            state.extra = (here_op) & 15;
            state.mode = DISTEXT;
            /* falls through */
          case DISTEXT:
            if (state.extra) {
              //=== NEEDBITS(state.extra);
              n = state.extra;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.offset += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
              //--- DROPBITS(state.extra) ---//
              hold >>>= state.extra;
              bits -= state.extra;
              //---//
              state.back += state.extra;
            }
    //#ifdef INFLATE_STRICT
            if (state.offset > state.dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD$1;
              break;
            }
    //#endif
            //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
            state.mode = MATCH;
            /* falls through */
          case MATCH:
            if (left === 0) { break inf_leave; }
            copy = _out - left;
            if (state.offset > copy) {         /* copy from window */
              copy = state.offset - copy;
              if (copy > state.whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD$1;
                  break;
                }
    // (!) This block is disabled in zlib defaults,
    // don't enable it for binary compatibility
    //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
    //          Trace((stderr, "inflate.c too far\n"));
    //          copy -= state.whave;
    //          if (copy > state.length) { copy = state.length; }
    //          if (copy > left) { copy = left; }
    //          left -= copy;
    //          state.length -= copy;
    //          do {
    //            output[put++] = 0;
    //          } while (--copy);
    //          if (state.length === 0) { state.mode = LEN; }
    //          break;
    //#endif
              }
              if (copy > state.wnext) {
                copy -= state.wnext;
                from = state.wsize - copy;
              }
              else {
                from = state.wnext - copy;
              }
              if (copy > state.length) { copy = state.length; }
              from_source = state.window;
            }
            else {                              /* copy from output */
              from_source = output;
              from = put - state.offset;
              copy = state.length;
            }
            if (copy > left) { copy = left; }
            left -= copy;
            state.length -= copy;
            do {
              output[put++] = from_source[from++];
            } while (--copy);
            if (state.length === 0) { state.mode = LEN; }
            break;
          case LIT:
            if (left === 0) { break inf_leave; }
            output[put++] = state.length;
            left--;
            state.mode = LEN;
            break;
          case CHECK:
            if (state.wrap) {
              //=== NEEDBITS(32);
              while (bits < 32) {
                if (have === 0) { break inf_leave; }
                have--;
                // Use '|' instead of '+' to make sure that result is signed
                hold |= input[next++] << bits;
                bits += 8;
              }
              //===//
              _out -= left;
              strm.total_out += _out;
              state.total += _out;
              if (_out) {
                strm.adler = state.check =
                    /*UPDATE(state.check, put - _out, _out);*/
                    (state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out));

              }
              _out = left;
              // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too
              if ((state.flags ? hold : zswap32(hold)) !== state.check) {
                strm.msg = 'incorrect data check';
                state.mode = BAD$1;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              //Tracev((stderr, "inflate:   check matches trailer\n"));
            }
            state.mode = LENGTH;
            /* falls through */
          case LENGTH:
            if (state.wrap && state.flags) {
              //=== NEEDBITS(32);
              while (bits < 32) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              if (hold !== (state.total & 0xffffffff)) {
                strm.msg = 'incorrect length check';
                state.mode = BAD$1;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              //Tracev((stderr, "inflate:   length matches trailer\n"));
            }
            state.mode = DONE;
            /* falls through */
          case DONE:
            ret = Z_STREAM_END$2;
            break inf_leave;
          case BAD$1:
            ret = Z_DATA_ERROR$1;
            break inf_leave;
          case MEM:
            return Z_MEM_ERROR;
          case SYNC:
            /* falls through */
          default:
            return Z_STREAM_ERROR$1;
        }
      }

      // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

      /*
         Return from inflate(), updating the total counts and the check value.
         If there was no progress during the inflate() call, return a buffer
         error.  Call updatewindow() to create and/or update the window state.
         Note: a memory error from inflate() is non-recoverable.
       */

      //--- RESTORE() ---
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      //---

      if (state.wsize || (_out !== strm.avail_out && state.mode < BAD$1 &&
                          (state.mode < CHECK || flush !== Z_FINISH$2))) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap && _out) {
        strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
          (state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out));
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) +
                        (state.mode === TYPE$1 ? 128 : 0) +
                        (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if (((_in === 0 && _out === 0) || flush === Z_FINISH$2) && ret === Z_OK$2) {
        ret = Z_BUF_ERROR$1;
      }
      return ret;
    }

    function inflateEnd(strm) {

      if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
        return Z_STREAM_ERROR$1;
      }

      var state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK$2;
    }

    function inflateGetHeader(strm, head) {
      var state;

      /* check state */
      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;
      if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR$1; }

      /* save header structure */
      state.head = head;
      head.done = false;
      return Z_OK$2;
    }

    function inflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;

      var state;
      var dictid;
      var ret;

      /* check state */
      if (!strm /* == Z_NULL */ || !strm.state /* == Z_NULL */) { return Z_STREAM_ERROR$1; }
      state = strm.state;

      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR$1;
      }

      /* check for correct dictionary identifier */
      if (state.mode === DICT) {
        dictid = 1; /* adler32(0, null, 0)*/
        /* dictid = adler32(dictid, dictionary, dictLength); */
        dictid = adler32_1(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR$1;
        }
      }
      /* copy dictionary to window using updatewindow(), which will amend the
       existing dictionary if appropriate */
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      // Tracev((stderr, "inflate:   dictionary set\n"));
      return Z_OK$2;
    }

    var inflateReset_1 = inflateReset;
    var inflateReset2_1 = inflateReset2;
    var inflateResetKeep_1 = inflateResetKeep;
    var inflateInit_1 = inflateInit;
    var inflateInit2_1 = inflateInit2;
    var inflate_2 = inflate;
    var inflateEnd_1 = inflateEnd;
    var inflateGetHeader_1 = inflateGetHeader;
    var inflateSetDictionary_1 = inflateSetDictionary;
    var inflateInfo = 'pako inflate (from Nodeca project)';

    /* Not implemented
    exports.inflateCopy = inflateCopy;
    exports.inflateGetDictionary = inflateGetDictionary;
    exports.inflateMark = inflateMark;
    exports.inflatePrime = inflatePrime;
    exports.inflateSync = inflateSync;
    exports.inflateSyncPoint = inflateSyncPoint;
    exports.inflateUndermine = inflateUndermine;
    */

    var inflate_1 = {
    	inflateReset: inflateReset_1,
    	inflateReset2: inflateReset2_1,
    	inflateResetKeep: inflateResetKeep_1,
    	inflateInit: inflateInit_1,
    	inflateInit2: inflateInit2_1,
    	inflate: inflate_2,
    	inflateEnd: inflateEnd_1,
    	inflateGetHeader: inflateGetHeader_1,
    	inflateSetDictionary: inflateSetDictionary_1,
    	inflateInfo: inflateInfo
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    var constants = {

      /* Allowed flush values; see deflate() and inflate() below for details */
      Z_NO_FLUSH:         0,
      Z_PARTIAL_FLUSH:    1,
      Z_SYNC_FLUSH:       2,
      Z_FULL_FLUSH:       3,
      Z_FINISH:           4,
      Z_BLOCK:            5,
      Z_TREES:            6,

      /* Return codes for the compression/decompression functions. Negative values
      * are errors, positive values are used for special but normal events.
      */
      Z_OK:               0,
      Z_STREAM_END:       1,
      Z_NEED_DICT:        2,
      Z_ERRNO:           -1,
      Z_STREAM_ERROR:    -2,
      Z_DATA_ERROR:      -3,
      //Z_MEM_ERROR:     -4,
      Z_BUF_ERROR:       -5,
      //Z_VERSION_ERROR: -6,

      /* compression levels */
      Z_NO_COMPRESSION:         0,
      Z_BEST_SPEED:             1,
      Z_BEST_COMPRESSION:       9,
      Z_DEFAULT_COMPRESSION:   -1,


      Z_FILTERED:               1,
      Z_HUFFMAN_ONLY:           2,
      Z_RLE:                    3,
      Z_FIXED:                  4,
      Z_DEFAULT_STRATEGY:       0,

      /* Possible values of the data_type field (though see inflate()) */
      Z_BINARY:                 0,
      Z_TEXT:                   1,
      //Z_ASCII:                1, // = Z_TEXT (deprecated)
      Z_UNKNOWN:                2,

      /* The deflate compression method */
      Z_DEFLATED:               8
      //Z_NULL:                 null // Use -1 or null inline, depending on var type
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    function GZheader() {
      /* true if compressed data believed to be text */
      this.text       = 0;
      /* modification time */
      this.time       = 0;
      /* extra flags (not used when writing a gzip file) */
      this.xflags     = 0;
      /* operating system */
      this.os         = 0;
      /* pointer to extra field or Z_NULL if none */
      this.extra      = null;
      /* extra field length (valid if extra != Z_NULL) */
      this.extra_len  = 0; // Actually, we don't need it in JS,
                           // but leave for few code modifications

      //
      // Setup limits is not necessary because in js we should not preallocate memory
      // for inflate use constant limit in 65536 bytes
      //

      /* space at extra (only when reading header) */
      // this.extra_max  = 0;
      /* pointer to zero-terminated file name or Z_NULL */
      this.name       = '';
      /* space at name (only when reading header) */
      // this.name_max   = 0;
      /* pointer to zero-terminated comment or Z_NULL */
      this.comment    = '';
      /* space at comment (only when reading header) */
      // this.comm_max   = 0;
      /* true if there was or will be a header crc */
      this.hcrc       = 0;
      /* true when done reading gzip header (not used when writing a gzip file) */
      this.done       = false;
    }

    var gzheader = GZheader;

    var toString$1 = Object.prototype.toString;

    /**
     * class Inflate
     *
     * Generic JS-style wrapper for zlib calls. If you don't need
     * streaming behaviour - use more simple functions: [[inflate]]
     * and [[inflateRaw]].
     **/

    /* internal
     * inflate.chunks -> Array
     *
     * Chunks of output data, if [[Inflate#onData]] not overridden.
     **/

    /**
     * Inflate.result -> Uint8Array|Array|String
     *
     * Uncompressed result, generated by default [[Inflate#onData]]
     * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
     * (call [[Inflate#push]] with `Z_FINISH` / `true` param) or if you
     * push a chunk with explicit flush (call [[Inflate#push]] with
     * `Z_SYNC_FLUSH` param).
     **/

    /**
     * Inflate.err -> Number
     *
     * Error code after inflate finished. 0 (Z_OK) on success.
     * Should be checked if broken data possible.
     **/

    /**
     * Inflate.msg -> String
     *
     * Error message, if [[Inflate.err]] != 0
     **/


    /**
     * new Inflate(options)
     * - options (Object): zlib inflate options.
     *
     * Creates new inflator instance with specified params. Throws exception
     * on bad params. Supported options:
     *
     * - `windowBits`
     * - `dictionary`
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information on these.
     *
     * Additional options, for internal needs:
     *
     * - `chunkSize` - size of generated data chunks (16K by default)
     * - `raw` (Boolean) - do raw inflate
     * - `to` (String) - if equal to 'string', then result will be converted
     *   from utf8 to utf16 (javascript) string. When string output requested,
     *   chunk length can differ from `chunkSize`, depending on content.
     *
     * By default, when no options set, autodetect deflate/gzip data format via
     * wrapper header.
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
     *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
     *
     * var inflate = new pako.Inflate({ level: 3});
     *
     * inflate.push(chunk1, false);
     * inflate.push(chunk2, true);  // true -> last chunk
     *
     * if (inflate.err) { throw new Error(inflate.err); }
     *
     * console.log(inflate.result);
     * ```
     **/
    function Inflate(options) {
      if (!(this instanceof Inflate)) return new Inflate(options);

      this.options = common.assign({
        chunkSize: 16384,
        windowBits: 0,
        to: ''
      }, options || {});

      var opt = this.options;

      // Force window size for `raw` data, if not set directly,
      // because we have no header for autodetect.
      if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) { opt.windowBits = -15; }
      }

      // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
      if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
          !(options && options.windowBits)) {
        opt.windowBits += 32;
      }

      // Gzip header has no info about windows size, we can do autodetect only
      // for deflate. So, if window size not set, force it to max when gzip possible
      if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
        // bit 3 (16) -> gzipped data
        // bit 4 (32) -> autodetect gzip/deflate
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }

      this.err    = 0;      // error code, if happens (0 = Z_OK)
      this.msg    = '';     // error message
      this.ended  = false;  // used to avoid multiple onEnd() calls
      this.chunks = [];     // chunks of compressed data

      this.strm   = new zstream();
      this.strm.avail_out = 0;

      var status  = inflate_1.inflateInit2(
        this.strm,
        opt.windowBits
      );

      if (status !== constants.Z_OK) {
        throw new Error(messages[status]);
      }

      this.header = new gzheader();

      inflate_1.inflateGetHeader(this.strm, this.header);

      // Setup dictionary
      if (opt.dictionary) {
        // Convert data if needed
        if (typeof opt.dictionary === 'string') {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString$1.call(opt.dictionary) === '[object ArrayBuffer]') {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) { //In raw mode we need to set the dictionary early
          status = inflate_1.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== constants.Z_OK) {
            throw new Error(messages[status]);
          }
        }
      }
    }

    /**
     * Inflate#push(data[, mode]) -> Boolean
     * - data (Uint8Array|Array|ArrayBuffer|String): input data
     * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
     *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
     *
     * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
     * new output chunks. Returns `true` on success. The last data block must have
     * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
     * [[Inflate#onEnd]]. For interim explicit flushes (without ending the stream) you
     * can use mode Z_SYNC_FLUSH, keeping the decompression context.
     *
     * On fail call [[Inflate#onEnd]] with error code and return false.
     *
     * We strongly recommend to use `Uint8Array` on input for best speed (output
     * format is detected automatically). Also, don't skip last param and always
     * use the same type in your code (boolean or number). That will improve JS speed.
     *
     * For regular `Array`-s make sure all elements are [0..255].
     *
     * ##### Example
     *
     * ```javascript
     * push(chunk, false); // push one of data chunks
     * ...
     * push(chunk, true);  // push last chunk
     * ```
     **/
    Inflate.prototype.push = function (data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var dictionary = this.options.dictionary;
      var status, _mode;
      var next_out_utf8, tail, utf8str;

      // Flag to properly process Z_BUF_ERROR on testing inflate call
      // when we check that all output data was flushed.
      var allowBufError = false;

      if (this.ended) { return false; }
      _mode = (mode === ~~mode) ? mode : ((mode === true) ? constants.Z_FINISH : constants.Z_NO_FLUSH);

      // Convert data if needed
      if (typeof data === 'string') {
        // Only binary strings can be decompressed on practice
        strm.input = strings.binstring2buf(data);
      } else if (toString$1.call(data) === '[object ArrayBuffer]') {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }

      strm.next_in = 0;
      strm.avail_in = strm.input.length;

      do {
        if (strm.avail_out === 0) {
          strm.output = new common.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }

        status = inflate_1.inflate(strm, constants.Z_NO_FLUSH);    /* no bad return value */

        if (status === constants.Z_NEED_DICT && dictionary) {
          status = inflate_1.inflateSetDictionary(this.strm, dictionary);
        }

        if (status === constants.Z_BUF_ERROR && allowBufError === true) {
          status = constants.Z_OK;
          allowBufError = false;
        }

        if (status !== constants.Z_STREAM_END && status !== constants.Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }

        if (strm.next_out) {
          if (strm.avail_out === 0 || status === constants.Z_STREAM_END || (strm.avail_in === 0 && (_mode === constants.Z_FINISH || _mode === constants.Z_SYNC_FLUSH))) {

            if (this.options.to === 'string') {

              next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

              tail = strm.next_out - next_out_utf8;
              utf8str = strings.buf2string(strm.output, next_out_utf8);

              // move tail
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail) { common.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

              this.onData(utf8str);

            } else {
              this.onData(common.shrinkBuf(strm.output, strm.next_out));
            }
          }
        }

        // When no more input data, we should check that internal inflate buffers
        // are flushed. The only way to do it when avail_out = 0 - run one more
        // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
        // Here we set flag to process this error properly.
        //
        // NOTE. Deflate does not return error in this case and does not needs such
        // logic.
        if (strm.avail_in === 0 && strm.avail_out === 0) {
          allowBufError = true;
        }

      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== constants.Z_STREAM_END);

      if (status === constants.Z_STREAM_END) {
        _mode = constants.Z_FINISH;
      }

      // Finalize on the last chunk.
      if (_mode === constants.Z_FINISH) {
        status = inflate_1.inflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === constants.Z_OK;
      }

      // callback interim results if Z_SYNC_FLUSH.
      if (_mode === constants.Z_SYNC_FLUSH) {
        this.onEnd(constants.Z_OK);
        strm.avail_out = 0;
        return true;
      }

      return true;
    };


    /**
     * Inflate#onData(chunk) -> Void
     * - chunk (Uint8Array|Array|String): output data. Type of array depends
     *   on js engine support. When string output requested, each chunk
     *   will be string.
     *
     * By default, stores data blocks in `chunks[]` property and glue
     * those in `onEnd`. Override this handler, if you need another behaviour.
     **/
    Inflate.prototype.onData = function (chunk) {
      this.chunks.push(chunk);
    };


    /**
     * Inflate#onEnd(status) -> Void
     * - status (Number): inflate status. 0 (Z_OK) on success,
     *   other if not.
     *
     * Called either after you tell inflate that the input stream is
     * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
     * or if an error happened. By default - join collected chunks,
     * free memory and fill `results` / `err` properties.
     **/
    Inflate.prototype.onEnd = function (status) {
      // On success - join
      if (status === constants.Z_OK) {
        if (this.options.to === 'string') {
          // Glue & convert here, until we teach pako to send
          // utf8 aligned strings to onData
          this.result = this.chunks.join('');
        } else {
          this.result = common.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };


    /**
     * inflate(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * Decompress `data` with inflate/ungzip and `options`. Autodetect
     * format via wrapper header by default. That's why we don't provide
     * separate `ungzip` method.
     *
     * Supported options are:
     *
     * - windowBits
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information.
     *
     * Sugar (options):
     *
     * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
     *   negative windowBits implicitly.
     * - `to` (String) - if equal to 'string', then result will be converted
     *   from utf8 to utf16 (javascript) string. When string output requested,
     *   chunk length can differ from `chunkSize`, depending on content.
     *
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , input = pako.deflate([1,2,3,4,5,6,7,8,9])
     *   , output;
     *
     * try {
     *   output = pako.inflate(input);
     * } catch (err)
     *   console.log(err);
     * }
     * ```
     **/
    function inflate$1(input, options) {
      var inflator = new Inflate(options);

      inflator.push(input, true);

      // That will never happens, if you don't cheat with options :)
      if (inflator.err) { throw inflator.msg || messages[inflator.err]; }

      return inflator.result;
    }


    /**
     * inflateRaw(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * The same as [[inflate]], but creates raw data, without wrapper
     * (header and adler32 crc).
     **/
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate$1(input, options);
    }


    /**
     * ungzip(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * Just shortcut to [[inflate]], because it autodetects format
     * by header.content. Done for convenience.
     **/


    var Inflate_1 = Inflate;
    var inflate_2$1 = inflate$1;
    var inflateRaw_1 = inflateRaw;
    var ungzip  = inflate$1;

    var inflate_1$1 = {
    	Inflate: Inflate_1,
    	inflate: inflate_2$1,
    	inflateRaw: inflateRaw_1,
    	ungzip: ungzip
    };

    var assign    = common.assign;





    var pako = {};

    assign(pako, deflate_1$1, inflate_1$1, constants);

    var pako_1 = pako;

    var arrayToString = function (array) {
        var str = '';
        for (var i = 0; i < array.length; i++) {
            str += String.fromCharCode(array[i]);
        }
        return str;
    };
    var decompressJson = function (compressedJson) {
        return arrayToString(pako_1.inflate(base64Arraybuffer_2(compressedJson)));
    };

    var CourierBoldCompressed = "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";

    var CourierBoldObliqueCompressed = "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";

    var CourierObliqueCompressed = "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";

    var CourierCompressed = "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";

    var HelveticaBoldCompressed = "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";

    var HelveticaBoldObliqueCompressed = "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";

    var HelveticaObliqueCompressed = "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";

    var HelveticaCompressed = "eJyNnVtzG8mxrf+KAk/nRGh8eBWleZPnItsaj0ZXWNvhB5BsUdgE0TLAFgjt2P/9AI2uzJUrV7X8olB/q4CuyspaVX0p8H8mP7V3d83yfvLj5MPfu/Xspnl0enH05Nmjs6dHz84mjye/tsv732d3za7AX5rF1+Z+fjXb426xUHh2N19shTBt5jef92f5e3M97+525K/3s8X86vnyZrEre7Q7Xv86f2iu/5jfX32e/Hi/6prHk58+z1azq/tm9bbZf/aXh/tmed1cv2nvZsuhbn/+c/sw+fGfPxw/efL4h5OT88fHR0dHj5+dHv/r8eT9rvBqMV82f7Tr+f28XU5+/GEng/Du8/zqdtms15Mfz3f8Q7Na98UmR0cnf9p90e4kv7e7Juyb81P7Zbvat+LR/7n6v4+Onz09f7z/96L/99n+32dH/b8Xj55ft5fNo7fb9X1zt3701+VVu/rSrmb3zfWfHj16vlg8erP/nvWjN826WX3dUQvVo/n60ezR/Wp23dzNVreP2k+Pfpsv2/vtl+aHXaHFo+cvHs2W1/+vXT2a775g3V2u59fz2WrerP+0q+wvu1Ndz5c3b68+N30f9DV5e7/7yGx1XdRdwZ9mX/4ydMnF8dPHk3+Uo/OT08eT5+urfaBXg/hzY8c/nBxdPJ68vb/+y3QnPun/+2H336dPD7319+Z+Nb/ahfOf/zOZ/mPy48nFTvh9V5H1l9kuiv/7mHDzcLWY3Rk/PT8/8H937S5alwtTzs+fHJRld3e576abZdau28VitjL+dNctPf/SrK72SV6EJ08uDsLsbietd9Hxmp2cQA36/vbanZ4O3zdbNctF86km0cdKNWbr/Teub73iT8+GTy26dQ7O1W5szvIpPm+/fG6WufiuKfP2OvP1Yrb+nIP1rVm1mbbLJsP7jSh5/3nViLKf2m4l6PyrKLuePwjYfG1E3zYhpp4O86VIq6t20YoIrZu7eZSsBxZ7E0i0+Xc3W2R8s2p2g1k0899ds+6NpijHR8dDRs9E+j3P6M+GLkom/pTRz/mDvzg6Pj6gX/2DJQIv8nf9Jcfpr96yvV3u0d/yGV/m9v/mY69k69/zGX/P9XqVv/6PXOp1/q43+YNvcyTe5Q++zx/8YOjZ2dDT01zqHxl9zGf8rxzVy91cdtvcB99wcafFgcqfi6Zy9sRM5Wo+v5qvrrq73B/d3rXXu+kHxkgwuFAZ+9gso8ucElfCgMW4zQ36lEvdZPQ5V3me0X/net3mUouclyJawnWE730Rwz6b9CrXSzi8iH2XP/g1Z+8ml3rIaJvRN6jqmedXTISTJ0clK1eV8jEbzRn7bLyfL66bHJLDXH/dbkScw/TsU8F9v0zz5DguI+7Tfl2IRmuf2arJ49OiXc0FXzeVb7nqVrt5/MoDePzsGIbNet6vW1MTy7JFD6ubbr5T7tp7vXTYy/0Xf0em0Jee/TQXTCygdis5uR64nt3cqDntwHEtRiuOfd81qwbG/umFLYZmN6vZFz/b6XnJrN0FRAMZF1ypb+blbD0S4XF1pRcL1gFR7y8ZDrFZLOZf1vO1kHZtvf/cdmGxaG5f5v2Q3N5zq9lXUdnZVXcv8MHLPy2ah6xVRtbd7GrVihNfrhp14uv2fnYVRpxL811PYgDc0HAcemV3l3O7NbdYpHbLm9mqu1vMOnGa9ma3zrwVXzdbhcWT9ctdyFkXnvuyZ3fdOnz56vrTbqEXVoa+QomTrC9AIvczvIIzPDm3M9ztnK5b4CnsamMmprzr/aBfr8UEtogntpRqI7cVSdvksrvxubsi3uW9mGL+mrrUnSBmoE//MW98apKd6l8Xe89XR7kGZbq4nn+dQ0L7R2LNfMEsBodXO37IV3rqQzZFUgxssu4vvmiYQFPzV/r5wlBxXO+IGY0H/0ylhzr6gF8FpJP4NcPOI+Ai5KQ4sWroRXHwq3LTQ5yKXMfXhTEPvJU6Lr+rCvjwqOVoNFVf6cvm2KVU7duisUI4k1VChsxk89fsiTYU5/HsZxdDnRftt2Z5IzL3TTyFX8WNJmc3OkiE6MOrNpGsKm294rb69U+OnJ3m3ed2JVr1is7uYai4wVviZ2USo7DZaOKMtYjpya2/w7Hu+lXOStSXUtCiWONkq8UE77rF/fzLYivqRQ30JA8NPLsolyaz1f18trief/qU+2pbt4bf43k8YceS5ZfRNBuZdbJk6VQZnsuaDdYy5vcYIJ8M6Yvw/ttuxYA34ewSaNXeNku8EDJzXDU383Vc+voQjZ0N03EeF+Yc3W5Uh+sRD3ZlDbmqRKalyPi4rKTUf9EIP3tW1q79ra54I8zi/Mv95wx/SgZoZq586/R4aON9Zd5oqrNjbRZ8Xls+jGRlDLBfL9PQsFsRXClzhVqP1Kae2jS6rg3KPI7t3KPLEp4xy7qgWdyLGz73waTdEzftiCPW43vXiZZQzC1Ucp3pY4FC71eqcYXztNyw6H18l8CrXSKv8/e9Tfn67FnJV72ifTk6//4WO84vJeyxjjLFZAtuGTFMzmvT2W+x2haHXdQ+zxYwNZRBvr80oVvd1hdjLr+MyyZPte90YGUoNLUG3UQzxQYN3ap6VffdW7lAtAyWNT8rPXi9swn10KONXQRWqC2ti+XPzs3Or+dXymh/jl8EC7Ox5e7vsX+8upV+ezOe10p1b60soZ9XTTpeDlgPUJ3NiEcWlL/Upnt2CrtFLBtqC7K4ErBvGx0KlSrcj55p0d7s+3vZinC3dTPtslSG8u6rKiP5ZvyKFmZyj3klfZdyHrebO8u8aHbPr43xX7r948h/PZ68bFbLP2bz1f4h8j8nz/cPqyePfzg9+tfj4ejgHgEd6hnRYOoIX8Sjg6sEhA1D4VU8ylXAqTdw66pAD+M/oOA8QRlCFtjh7lBAh4GD6HU4erc7Oj7xwxK0wEL7QXm/Ozz3oxIAQCEAwCEAQEsAAFEAQLEAABuGdmC9oyD5sDu6sKNp0D7uG3jkh6VJyKDugLsQ1i4nQ1dJhk4mQ5eToasmQyeSobNYABti4eTr7ujMjjbhaBuPSosAQc0HOhTC0WmIQmKcxqlzHqxFeSEQDVvjcuwW9ZVAlVrKoWxi7kKTqB+N6840mXvUBBrjxmmgF/46IxzyxnjcuyAHf5HBAQyRDRhXXmBiNgSTyBWMa2swmf3BBDYJE6JTFAx2UdA0l0LjMMbuYYKwkKJ1ucPYTIyP5aSwFZMqOVkxGJNrOZmsxoToNwWD6RS0yWgrEHmQ8WxEgx+gERmicBonI3LORlSUFwKRERmXRlTUVwJVaimNyMTc6SZRpxvXnW4yd7oJZETGyYgKf50RGpExNiIXpBEVGYzIEBmRcWVEJmYjMomMyLg2IpPZiExgIzIhGlHBYEQFTXMpNCJjbEQmCCMqWpc7jI3I+FhOCiMyqZKTFSMyuZaTyYhMiEZUMBhRQZuMtgKRERnPRoShQTeKnAIbRfIlEtmcgvyixsmmoii9KhR5VeNjDZHWFUvkXIk6JUwUddbEMpw6USVPiyIZWxBfVzhaXBTY50iVZhfKgONFTrYXReV9sUQ2wKiTC0ZRW2Esw34YVTbFqEZnDBrYY+DTSnk0yiiwW0ZVWGYo0FVSgc0zit8dGsJGoz42NCqGGsuMDo1krVGN/ho0MNnANxW+rXHy3Chm43WCtouUOgQlstwgseGC+EJTMluUpNVCgVea1qsuTRb1nEeoUhahpHMIS3AGoUbWihIZK0ivJUVTRcyWGjRpqFAC7BQpmSlKykpRz0aKKtkoStpEsQRbKGpsoKhF+wQFzBPoVJZF40TMtomaME2QO9nNbJgofSfJhVmiWk/yilFiiZEkTyaJWrRIUMAggW4k3WpK1ohSNsah9eiKhijkxskPnbMZFuWFQGSDxqUHFvWVQJVaSuszMaeESZQPxnUymMyZYAJ5nXEyusJfZ4QWZ4z9zQVpbkUGZzNEtmZceZqJ2dBMIjczrq3MZPYxE9jETIgOVjDYV0HTXAqNyxi7lgnCsorW5Q5jszI+lpPCpkyq5GTFoEyu5WSyJhOiLxUMplTQJqOtQORFxrMRlbqiEzmjgLpAXgQCm5FJLxQjO3JB+pHJrxSrVVZakqu5/12jBHBBZ4DrnAKukC+5QMZkwmvB0JocsjeBIs3JdHAnZ2RPLih/cjUblGvkUC5oi3KdPcoVNilXoksZB5syNhXl0KgcslO5IqzKxE50IZuVC6PpKuzKtVq6VgzL9Wq6JstyJXqWcTAtYxvBtoqRb7mQjatUDI3LGQXXBTIuENi4THqhGBmXC9K4TH6lWK2y0rhczZngGmWCCzoTXOdMcIWMywUyLhNeC4bG5ZCNCxRpXKaDcTkj43JBGZer2bhcI+NyQRuX62xcrrBxuRKNyzgYl7GpKIfG5ZCNyxVhXCZ2ogvZuFwYTVdhXK7V0rViXK5X0zUZlyvRuIyDcRnbCLZVjIzLhWxcq+GHPrwKhVBgCybLMsyGNQgvMiGzKlha1SC+ykRXT5pU0XKfF4V6vGDd30Xl3i6crKlgMqYBv04ETakgtiTj0pAGFeyoEDKjgpUVFS0bUVHIhgrWJlRUtqDC2YAKj/YzUDCfgUxTGTSegth2ChemM0hd6h42nIJHEk+YTVF04lWMpqiVxEsmU3i0mIGCwQxkk8g2E7KWgrOxDOmOzmKIQmicvMU5m0tRXghE9mJc+ktRXwlUqaW0GBNzV5tEfW1cd7bJ3NsmkM8YJ6Mp/HVGaDXG2GtckGZTZHAbQ2Q3xpXfmJgNxyRyHOPackxmzzGBTceE6DoFg+0UNM2l0HiMsfOYIKynaF3uMDYf42M5KezHpEpOVgzI5FpOJgsyIXpQwWBCBW0y2gpEPmQ8GdGfh9w89iPvDEMhfsBD9xgtUQNEAQPFYgXMwgRsiJCTw+96Pf7hxMjw010F/QSFTo1YoQGVV+KoZMFcfBj+XLzgVLxYc/qACfSRn3fouXVPfxQ7s0fFxQGFPgKeurynpY8AWU8As54ANvQEkGKpjtwLfh5swLW9Azzzo9I6QFBlpyWA/rUWuQGVToDwGaIYGqdAGlfRNDGH1CSKq3EOrgkcYRNimA1TrAv/kMMwzaUg9IYo/sZzJ3Du0/lSd/T7CGN3FMTdUTh3R+GyO4oouqNI3B2Fp+4oQuqOIlB3FMzdMfAPOQzTXAq7oyDujsJFdwwSd8eAqTt+HXriqR+VUwEq8QcUQg8cKgS0BByQxRqYhRnYEGEgJbiOZrag6I/iCqpHpQWAxHqq52kp1dO4iuoRrZB6RoujnoV1UU9KCxyV3jp25CuM/iguYnoUV/4HlJc0PU+rmQO1bX8Bx/VNj2jt0jNatuxZG49yndtKBVtZwTbXpJWLrF4RdWzjcr9HcaX/K44JiP5qPy7P7cicyVGJPqKw2D8IfxtG2GH18TccYYBKfgIKkQIOkQJaIgXI4gHM+gzYkJ9ASogczeJRbsEst2BWacFMtmCWWzATLZiJFsxSC2a5BXGl9be8xNqjLnyky83sKm3qZJu63Ca+SABFtLYTre1Ca19ODtfh534U7a9Hwut6nryup9HreiQvFnuFXLBnZdQBipb3cvC3Mz+Kc/9L9DdEecZ/Sf6GFPwNcJz+XwZ/A0aT/svB3+Ao17mtVLCVFWxzTdjfQBF1NH8DFNceLyd4Tfxyki6HX6asBp5c+eUkXf++FFkNCrnyy0m+4H054WvdPdmGbNnmrN7m7A0GjOOCBPoyUtVooSLfPTWNIVL1cKJCPLJIpkFGKo23qEJ6kEAZTSoNSFZF6lORPAq4QB6xVIKGDKk8RkjmIR3ltiqMhkWOeSryvYazE5CqTYEKjbedrYJUco2ogoGQQF5CqrIVKpIdhgqQ2ZCqfYcKsQWRzG5EcjSmKG5rI4ztitRkH79NhhvLx35o95SRxdvJrnyIh/vLygs76u+unvmh3csDhjftHMcffc2S8SfGtxas3zAQgFKf/xb2VB8T4zjU9lST/EEwCEvYcXxGjAMkdxyTVgtV0DleuEuXYsGRU7t0B6nca8HwGePwuSDDh7eOmEH48N5RaWm6eZQEEb6i1cIXdA5fEbc5Fhw+4yJ8YXCGIEYlhZJkHdBQ6ENVweAGIYQ4KinQUVbhDiWqQc+lUuiTEcpopm6oGuFQYJimQjcY4w5wQYa+yB8Eg3AXhIE2xiE2QQS3aLWwBp0DWsRtjgUH0XgK327JC3cb+qN4EdujeK3eI3Fd2/N0XdvTeF3bI7p67RldvfYsXL32JF6rvxr6/syP4rLzVe5vFz7YjPpq6GOPyz92R0/s6KP1/yvsZkDQdKflNoKf0m4jDKj4NHSDIeoL49QhxlWvmJi7xiTqH+PcSSZwT5kQu8sw9RnO3xQG7r3K7E0q9CPO3acRQY/idH5BiPpWTeYkUS+nx34DD3snob8jp06PIvV8FFX3xxI5B6JOiRBFzoaockpENeZF1Cg50k5uFT1Ok7F93KoIJEzatnwqOKRO2s58oTglUXUzs9IpnYLGOQWbziCjkFI+oUTZhJLKJdRzJqFKeYQSZxFqnEOoxQxChfKHtqzmOHHu1Des5gKQN7Rj8zRRyBnax3mRKeVLZRdnVilXQOFMKVuCIE0MUY4YpwQxrrLDxJwaJlFeGOekMIEzwoSYDoYpF3BjH4WBs6CyrY9U6H/c8nYaEfQ87oK7IER9rvbAkUS9XTB3dbzNgT3OCnU8y9T/LKs04DI5G7gEJQXLnBusc4qwHjOFVUoYkt9VY8rpk2SVRVQIkokUyClSILVIgQxjhRKN5ZxvVILSjlTOPtvDA3nnjDLOBco1F1SWuZrzyzXKLBc4p1zhbHIl5pFzyqCwY48jwllT26/HMmRK2MJ2SgyyI2xru2BGGSE3tbFGWWCc+79cbkL3G6LeN06db1z1vYm5602injfOHW8C97sJsdsNU6/jbQgKA/d55SYEqdDjeAviNCLob7wrcUGIelvdkyCJ+rpg7urySih0tSHqauPU1cZVV5uYu9ok6mrj3NUmcFebELvaMHU1vthNYeCurrzWTSp0Nb7yfBoRdDW+BX1BiLpavQNNEnV1wdTVfwy9PLyS/gf2MLLSu8jii78g4D0xwPbqLzB/wxegv+ILsLzjC6j0ILBZaJm9oQIovkXYI/HkrufpcV1P4zO6HtEzt57RQ8aehfcEexIfuP0B/Xb81FBjmdQfxYdKPSoJiig/vu55euh0oPDEFXB8ft0jeh7dM3rfbc/aeJTr3FYq2MoKtrkm/DgUFFFHe/AJKD4d/wNHxxD91xN8A74/im/A90i8Ad/z9AZ8T+Mb8D2Sb8D3Cr0B3zN6A75n4Q34N5PDWw8nfhRdu0fCmHuePLmn0Y57JN9h6hXy6J6V+AOKDvxmMN9TP4qvNr7JluvCextEb7CXAIlR/oZ6CWgc5W9EL4FC4/9N6CVgYfy/CXPEmzA9vBmmAdc+xhH0hsx/oOUWJfS+IUoB4yoPTMzJYBJlhHGdFiZzbphACWKcsgRvMp8Sonyp3GQmFTLHEKWPcZVDJuZEMomyybhOKZM5r0zg5DIhZli+j25omgPxMZfirFM3zQepPFmF1DNEqWdcpZ6JOfVMotQzrlPPZE49Eyj1jFPq4QP2U0KUepXH66RC6hmi1DOuUs/EnHomUeoZ16lnMqeeCZx6JsTUwxcIKEOmORAfcylOPfX2QJHS+34nUuA0HHnfTxcRKanf99NqJT0r7/tpmVNVv+8nVUxb/UZDRZUpHMpgIkeB0zmqMqljEZHasQAneFQraR4LpWSPckr5KFPipxc9ZJZOa6H8WPtEGhDVtzwOBd5OeB/k20naB/mWn3US5uK8zYtwKp62OCYhfSQ0iz8WRProLr/xWrY/pGvZntG1bM/UtWwv5GvZHtO1bM/4WraHfC3bw3gt2yO6ln03GNmZH8WR9C5ZFvA0Zt6hOQGSo+NdsCFg8d3Rd2g4jmaxETPRA3YN/sRRrQNmugNmogP8Mhy+V8V/luNvF+L+0at2AT78DpIRPkdVaERr7eI8sEpzG93ccH2OvITBq92IKDQqCp+3Xz43fb2889pYpBXNaWtVb3XVW9FTfOmOkqi+XbtjudxhfvHuxVZ0KBq0Ev1De7hAWTd385wZXSzUidN0tbh1Om6diBu/6IySiFunur3Lyb+Jh1s6FI3BV86G8+EG61Iy7bBOAnux3mOdVBGytMs6Ccmf8z7rpFCw0k5rFsCz09UPc+Xe6uqHJfLx2tUPy+zo6eqHOXl74TPR7OTyJpDVGx/tX2X6ptX6N9m/CdXu5YnAOJmLr3rCwOfFEH+NqmWaIUxgG3JhLFRqwnBNzBom0tRhvBbGPIkUJc0kRWhF4TSnmDDaTjW7mFZLido8Y3qtrWnGMaGSGWnuKcJKsVoI0lTkgpyPiiwmpSJ1oniankwY7QI1UZlW64LalGV6rQvy5GVKZdRuBNsqVmu+mtXCBUeY26KSvjPKaZ6Lso57LKOiH0ukPohynv+ingMedQ57VNOMmG7KnEmBZ8eRmzK6iJgp9U0ZrVZmzcpNGS3zDKpvykh1Vg1ZnlOjzDNrVP+DjJKzbCwxnlF5xo3ydxIqzb5RZael+wLR7eRNA/3F9fbkuTnKyZ1J/n7I5WxNJdScHYvwzB3V8U4Rs3jQ81we5Lb6wTyvR/k/iI6c42OJ8YSszvex1HiE8twf5dG8zOuAIK/qynj48sqAZL0+CIXUKiEU6KofzSuGKP8HnStXD7HEeOdWVxKx1HjnilVF1Ec9aVNVtnVlPHR5zfF+WGic+VGcI9/jggKQmCvf08IBaJwV34cFAjC69/0eFgJA4hT3fsKvH72fpDePypMBbGvaIcWcWq13SLGY2592SDHnSOQdUizEmKQdUsQpOpWdReHxCMZJ7yySIkVsZGeRLJFjp3cWSZGjWNlZJNUYT72zSIkU2bFNNvBoCYOrNtkIiQJb3WQj9BxUtclGSBxQuclGaDGYapNNliiQ9R0o5QEcxjDtQGFO0dM7UFjMcUs7UJhzxPIOFBZirNIOFOIUpcrOjfe8PaGuUMBqOzcqsgrfyM6NSgkKZnXnRkXn0FZ2blRUCvTolgVWOexhy0JiFOq8ZSEJKrxyy0LSKKRiy0JSOIxpy0LiFLrKG/7OOVz2xw6eK0bhcoHC5YIKl6s5XK5RuFzgcLnC4XIlhss5hcsECpdxDtfwA+7PM6FQFUyBKliFqWg5SEWhEBXMASqcw1N4DE6hFJoBU2AGSmH5MITkqR+VcACKvyX6IYUBePot0Q/YfED0W6IfQrOBhd8S/YDNdfQitOdF7LkexSsuF17Fo5gKPRL93fPU1z2N/dwjecuqV6j3exZvTvUodu8e+W/E9kdxu0GPSggAhYYAT5sSeloaAsiqC8x6DNjQY0BKCxyVK9szIOU20HlBsZObnJh2jweRTsxGJma4fwM452sj8rUR+Wp3ZBy18Sg3o63UuZV1bnPl+E4KKKLadssEUB5TcG/EOgTvSXjPdaFnu5yNXSX1Opl6XU49vpkAikjKTiRlF5JyOrjeuR/F17Wm6HqAxC6IKbke0LgLYhpcDxjtx5iC6wGJ2x+mE3x1coreBUi8JDkl7wIaX4ecCu8ChV58nKJ3AYqvOE4nuOdnit4FKNr3NHkX8GTCU/QuQGS10+BdwMIEO0XvclSc6qmRvX7qR6VNgOI7m9NkVMDT7wNN2agAx1/amwajAkY/lzdFo/KGtaFAm5uhfgl6SkYFNFdO/xL0NBgVsPhL0FM0KkdmVN4fXSjQ5YaoXzmckiMBzQ3RP2I4DY4ETMQ//kbhnmzDONnm8bxN4/bjYGTDD2V9RCdDZg80gcW7wCDgrV/Adr8XmD+kBOg3bQGWO7WA7Bmks72lPT23I5sqHcWp0jlOlU5tqnTEU6UrPlU6s6nSkU2Vhvply5k1wh8FAosLso/J1LBs/pWyj2hryGj6+xh8DQuW+AOy+Dsrk/sTIMOyzAvRZxrRXH/4hqzS3ka3Nz5bAy7i0Ig4NCoO/MBsz+ZhOM3juOsRbVb+OHglfEcrgtDWGtzqBreiYekZGUg++ADa4zBgoqN9decMV3eeAF0coZ2wl65mJZ22kk5YSXpeBJJymU65TEcugw8tEuOGpMcWSZDNVA8uksYNzo8ukpLaxw8vEmc/xe2Fg1ml7YXMlb2q7YUskdHWtheyzJabthcyJ/MtHB3KGA9JE8iLjcvxaqoYtKbxyDWBfcmEZE6mkFMbjxfRxmnE8jMr/hpVy+TgJrCNuzAWKmXorglXN7EWx+TvJlTjmJy+CGD3hsjzjbPxF6EV35umABNGg6UmA9Nq8ahNC6bX4pXmBxN4kkhPOVkQ00WRcM4wVvNbPXuYOmKraR4xoTKZmF613TytmEK2S48jFeYWqweSSpMBqTySVDKHRT6UVGJqvHgsqSSeeUCDyQcpzT8oqSkI9TwLoUoTEUp6LsISPB2hRjMSSjQpgYQOjJitAjWanVCSRoIFhJegzHaCGjsGaslkUaT5CiWassLz6mAc4km2+L5K1dP0hRrPYEH7TjjVPBZkMZWhPhLuNKGhNhbuNK2BBjMbUprcUOL5DbRWnyPNcqh9L6BqrkN5JGC1GQ+LpAsiFHniQ43nPvX6hNDEDAgqToKIR2YFPRVigXHnTxMiapU5EYuMTQ55ZkQxTg77ncJfLav2R5tw5D+X3h/F+3M9SvfhimXi9xa0yWibP8inMZ7PNVgwnqugTUbb/EE+l/F8rvDOE5ww8E2Fbyvfw+ePYq4EdCVUAehG0q38Bj45SvnU5SUcOG9Bm4y2+YN8OuP5XPYuBZzM2Eawrfgsn8+FfEJ7GwFOaGwj2FZ8lk/oQj4h/M37k0A2iWzTp/hE4m/eDwr+WeuTiDYZbfMH+VTqz1ofpMsdvdxbix3FFxv2ZGHn7I/ihNej+PwfhPjM6nKS3pC4nOCfGLxEBwcknrRdkl8DjU/aLoU7g0JP2i6DFwMLP5x4GTrncoJPFy4x/oBSXa9wOXZeyG3Qb1Vkr9JdiPOAb3NJ/T1pz+Z5wLe5ZOV70i9blG8y4VaV1t92mPIn6y+zq30Izwfaf3H+OyJHWSYtRypeeBv6aqMijrT90UPQtkGj3uaBNlDdaYa5Pjghn8Zv2OQvfciltrkUV1TN0YOkU8Mw17ZwqC3uRKQvfciltrkU11btTCySeuu5VE2+9axErLxeHkT+UCm/rZRPDaotGwZdXbads8ItorXGafqqjTzBgyy7lWW5HZUVSFH9Mi41A6TUDtCwIYA3+iQPuvRWl06NQS23ht91Hmqb3nUmDi3Iyy9DD7nUNpfiGqsV2SClt16HauW3XlmACoslnLMHUW4rynGl5bJu0NLLp0Pl8sunLECtxTrQ2YMotxXluNZybXjQPk0O96NO/SguwnpU7j4BEu9K9Dwt1Xoa35XoEb0R0TN6I6Jn4Y2InsS3PT5BxJ3sxsOiWa/7mx9PC4wfanJD6Y2cA9INzW/kHGh6I6fHuf38Rk7PRPvbeJTrrF6/6bmsYJtrol+/6RVRR3r9pke5Q+gvcn/KS6AnURjoYdW0v77ot1n6kd0fcWQ38QDFLZQHoVxmrwSirzVO3+1cnUDsD5UCnay2O1Sr4sTxb8yJPy+n/7Lc7TASTvwo+sUtjgRE+XLmlkYCUhgJgONVzm0YCcDoWuZ2GAlwlOvcVirYygq2uSY8EkARdWzjVeItjoQB5V3rWqC2VPasV1TR6PqO9UqB3FeV/epa5ejU9qtLua0Ko2GRvV3fjK4LjDarkg61nehapiSpbEQ/qHeT4QaxH0XP6JH4qfKe411gp/Gnynskf6q8V+inyntGP1Xes/BT5XeDDR1WNXdoQ4Cwdj1dhsYuc2OXlcYuZWOXubHLamOXorFL0dhlamy8T7gMTV/mpvNScaDhkfhRRBSEygNxEnM48uNw4jow4mE4CRyi9Cg8YggWXuJTIDhs6hJ/kMKvIh1FRLGr/CYSiTl2+ReRiOvY5d9DYoFjl34OKWKIXfgxpBgIjp264VCk/FsRR0rgOI79UoQsImJa+Z0IqVbiW/mVCC2nWOsfiVAixj3/RIQKZeqD6g9EDAXKrW3oA0MUfeMq7ibmiJtEsTauo2wyx9cEjqwJMab5ccAS7/1TIDiC6t7/QdqtF+hu/57QDfp2OLF/ZBOO/FqpDavoNq+iW7mKLosTrkq6MUocKoU3Rgk95PNsBaKK1h9etvJW45nQuN7pVuNQ03SrUfGHSgW2NU4N+s4TSljfcZvUrcYsQXvoVmOmD/K0W02pHaMPO1u+OXcWMdcfb84N1cSbc4Qe8nm2AlGF649L29Hd/Kxy3UmGJpCyqSoP1aps6wo1j+XcysrG+zbfgmQB2hRuQTJ7ECfbKkZ1H3myXC42+jt65+cRla9hbhsaicddjSTCqVmy/Y3EfZMjCb7TkYSy3ZGw7XmM/DKjK4EqYSiPCjMvj/2SMiTGs4ivc8nrXcNn95mLajSV6jWV6jVjvdTUeyn+sTDSKj3Y1HqwqfXgp4xEh95UMjDeAmP1c0ZzgSrxnI/FbV6P27wSm3ktNvNabP47I1HqdjQGC4EqDV6Mf5H9ZbXI7zISbVxWzrmsJO1ytC7LyvhuBaqcuB3r3bbeu22ld9OfqSO51vltJaxtpYlfBCrTDNnMv3PRlUCVAK0qPbMa7RkRsXXlBOvKCdZVO12Pnlqh0Q90AlXq2o1lS1fPlq6SLXxdxXItW7qaVXR6ItwvNC7ivL/JyN+XN7TNpWyRwRyaT9K3XKNvlQh/q2TDNzEL6b99apiXXXiReRy/YZMRrLnya2ht5TW0tv4a2heo6Ol5If7wy9A2fIRO8EV/9/AttXeHol4Ty+tIh8dt9FWmnrm6aD7dly89/P+H8wtTywf7Vc5RxrbSyVqopvjKlf6YW5jQLK+UFu0hl1hX8MgJ1yMnRGtT6nerM/TFYZithlX8sR/F20IrXLsDEjeJVrRiBxpvDa3COh0Y3fFZweociL0wb2h4Ke4UwGGwnBvZLdoOg3QFyzUg2B7A3hyAQ2uAlMYAKm1xFA9CRzlfhINUz0XtY4PXOdmtqU7sYBkOhm8FMuQbEjwP8CH4Tr5g3M2SPPCwT8HL7b7zzA/CuZx32JwuhaLTXdapLutSl9HsCULuyy735TBXOviKzduGg6HmQLyKAyx31GAoGqLxaJwGpXE1Mk3Mw9MkGqPGeaCawKPVhDhkDdO49RubmBx8u/M8Yh/GRmJiGBbZYVpKEVNinhimnDBOiQGvGDNR47aIi0x0o+ToNzFaQMHuA4UsM4mOYDjagmPhDSZGg7Db1KmD2SoKz35RFDcHI8o54KEnhaLTUVVGIp54sqJTRftKetzJvJJI0Wbg3j6FZptJdB1xy35Qwt9qIkTWk/5SE3NlPfIPNZFE1pP/TBMLbD3przQRJuuhP9J0yjRYT8FuPUZiPhkW+WRayidTYj4ZpowxThkDuxKYKNMo4iIT3ShpPSZG6ynYraeQZSbRegxH63EsrMfEaD32Mn7qYLYe8beR6BPuLkaU9cA7AxSKTkdVWY94YYAVnSraetLbAswriRStB14VoNBsM4nWI94TKEp4eo0GFAW2oaiyGUVVWlIsIowpFmB7imoyqSgnq4oyGVYU2baCSplKWrSwIIKRRU45GkWVqbFEzteoU9ZGkbMzqpyjQa1yaVmhyKLGx0KhrTAWIUMMIthi4MsaJ4uMIhklicouYxEyzSB+qaRXMtCgChsNOvhl5NJS+VUiGVK21/qLRLrEd1KXDXfsLSJdZjS9kwWrV4ik9rUS4m2NkzXXXh866HlrldhSVd5kGD7C129DobTqJw7foPfWrdPkTRy/obLhci3+lHhS8Hukp5ZP6BEhVfhOHxu0hXM42v/NXCbxbqBjcauviB8Smdr910L2fz7+WSRlpiUMM2RUyo3e4Q7uaRYH5XBf+OswzR/M5ivO7YDKhA4ovoPtHF+8dmpvWzvyt6ed+evizso+Zif26rShkghPrU1Rb3Kb/N16QLpNjWxTfHXecW5qI5raiKa28SjXua1UsJUVbHNN0nvtrog6+hvsjnLs6fd2N2XdeG5H8f2+TVghOorLQufpLcBNWAA68lWfM1/qOSvrOye2qDNUEuqJtckXfRtMKEBxG88mJRTwtL7dcEIBjmvdTUgoYLSq3QwJBUe5zm2lgq2sYJtrkn6GxxVRR//RHUdxQb3BhDoE/2GC2/ceMPiA4va9hxR84Ol52wMHH3DcNPcQgg+Mtu9ti6v6kY1mR+aqjsTOli27qtO4h2UbXdUZbcLZoqs6iRtStji9HhmKBZrcKNqytM226lw2SuxI2gZbdSTayhuOtsVW/SjXWe0n2rKtOs010duFttFWncWNQdtgq4Z8+TJEHx9InBCiNqUHEsxVg9UDCZao6fmBBAvcHfxAgjHFIS1dKRaiKOekcUpM5yOxECnqUs5T0ypxShlrQi1OrUCVBsosNrHeEM5n4zqpTa61hdPbeKVvU6LDK9OQ60gpAihRxqOk4oN6DhGqFCWUOBKocceiFscAKhQq9bsaOVj6AzweUKIhEaTxYImBEdQ8NlCuxzKNENRGYtlqWm+7HC2ojzaQxwxKethgiZE28uBBqZ4UPIS+lfXquR3FNfi3sF4FlNfg33i9ChTXq47j0vxbXK86o6X5t7Je9aNc57ZSwVZWsM01SetVV0Qdfb3qKF4rfMOZiBHVP81EiYvGqZkoSbkf0kzEnFubZyISWoEqDZS9pGYiliqVrXRanolYoO5LM9HAy/0qhaiJxqkPnYumm5ib7lLuQ9MoLMa53SZwHxahFajSQNmHJtYbwn1oXPehybW2cB8apz7EX0GqYWpq0Kg/oyZCEQrkcEQ5923QKWRB47gEkfsZxbaCR4Ig+zwUGG8o933QdP+HImNt5TwIGuTCv/73/wO+9kRf";

    var TimesBoldCompressed = "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";

    var TimesBoldItalicCompressed = "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";

    var TimesItalicCompressed = "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";

    var TimesRomanCompressed = "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";

    var SymbolCompressed = "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";

    var ZapfDingbatsCompressed = "eJxtmNtu20YQhl+F4FULyMGeD7pz3AY1ChtG7NpFA18w1NomIlECSRcxgrx7SVk7+wOdG8H5OJydf2Z2d5gf9cV+t0v9VK/r+6vXsXlOlbHe28paq229qj/t++m62aXZ4J/m8PRb1z9/baZxefK63Z6eXN5dVMvTCh83u277xr/6kLrnl2XNq7TpXnczuZyabdee98/b2VzM/x4/dd/T5qab2pd6PQ2vaVVfvDRD005puE3Lu7eH1HbN9hTjx4/77/X6y5lcnUmjVzHIVVDicVX/1W/SsO36dLMfu6nb9/X6TAoBD+5euvZbn8axXtuZ36dhPJrVQqgPQoh5hev91LWLkIv94W1Ygq9+aX+tZAx2tfz64284/sblN/rqfLP/mqrbt3FKu7G67Nv9cNgPzZQ2H6rz7bb6vLgZq89pTMO/M/xfEqturJpqSM/d7GJIm2oamk3aNcO3av80O5xh3yyKmm1193ZIT02bqovTKjP+MAf++7zsZvZ3276kYyWWXB0z99S18/PbafPHQ71W4fjn/fxnFO+ZvkrT0LVzTr78qB/+nk38bHM9exgP8zr1z9U7jt6840YW5uSJKcZOCaBBnKgm5mU8MVNYyMwWFvO7Ukagkmgg6sDWQ5yFFqjzUrLEaQ3BEmiwNsMSaZS0vgWfOkPHWQowNeTUc0kumnxZvsgPxlGai6VTGUqAVCTQ6QkWnc77DKEiLktSUBJKqHIQZ86d8gCpHYoiEzMsb1ubYy8vW50DChB5ZhGqrijD0EqUIeiaEHIfCg5Kpuu0ApiToaGPSY0uaQsyr65L2oKi1yFt1PLaQ3lzfXTgXodGoJYzglndSLDMPg1sTPJpQJHJigw0QrGERqD9YhyTOgONQDUyuF1zaxuokc/BW2ztXCMrGZ9WMW1oQZHIXWNBkSCfRZEL5BMUiZw6CzVSFCfUSGZFNjIldoKDkonTKQiJIGzWmFd3BizJJ9SINoLDriOfUCOZS+zg+KGD1qGiLNMLxtJD1/ns00ON6EzyUCM6vbxhoBKaqbG3DFQCNiL1iHccBPV0DHhQH/JW8EW90dkyFKGywCJU0WkVSvSGeiSUODWFFD0HYdPQVoiRgfPMA+/nnRgiAyNYSjpWNQcNSMrtFCUH4ZIRpSCWocFCSuhCEY6hoUClc0WC52BJlCYYLQdhN+hygRRRlo5BKRRLS6oihSqh+ZzzRGG1Mo4Iz1LoP0qsxDGFzk0JE42ji0jCPejomJKCuwil4m5CiRMEUMVSzVLDUstSx1Juc0oVWMpqY295qVltmtWmWW2a1aZZbZrVplltmtWmWW2G1WZYbYbVZlhthtVmWG2G1WZYbYbVZlhtltVmWW2W1WZZbZbVZlltltVmWW2W1QYjQCh7E2aAQHeGhCFgPoNoy8KNb2wxBhmGKBxoUZXlLGsLI6AsftEDHV0wIURVbANLcTKlGGBIKPOAxCmhePCKUwFzAmpDFRQvjA9R06Hq8TONvshgKDCuRAZTXigUxjxNFfKRo3CLhnIJBMFRvMZpqpNBMlQJzGT5WFQMVQI/AikPMIhEU1aDjqJvQwmjSHB05cC9jbYwc5UtAHNLhDw41ha+lEqF4JaH3gmB61SYcqInxTDmQK8v08vjqv4zDf1N0w3Lf4A8/vwPpfK11w==";

    // prettier-ignore
    var compressedJsonForFontName = {
        'Courier': CourierCompressed,
        'Courier-Bold': CourierBoldCompressed,
        'Courier-Oblique': CourierObliqueCompressed,
        'Courier-BoldOblique': CourierBoldObliqueCompressed,
        'Helvetica': HelveticaCompressed,
        'Helvetica-Bold': HelveticaBoldCompressed,
        'Helvetica-Oblique': HelveticaObliqueCompressed,
        'Helvetica-BoldOblique': HelveticaBoldObliqueCompressed,
        'Times-Roman': TimesRomanCompressed,
        'Times-Bold': TimesBoldCompressed,
        'Times-Italic': TimesItalicCompressed,
        'Times-BoldItalic': TimesBoldItalicCompressed,
        'Symbol': SymbolCompressed,
        'ZapfDingbats': ZapfDingbatsCompressed,
    };
    var FontNames;
    (function (FontNames) {
        FontNames["Courier"] = "Courier";
        FontNames["CourierBold"] = "Courier-Bold";
        FontNames["CourierOblique"] = "Courier-Oblique";
        FontNames["CourierBoldOblique"] = "Courier-BoldOblique";
        FontNames["Helvetica"] = "Helvetica";
        FontNames["HelveticaBold"] = "Helvetica-Bold";
        FontNames["HelveticaOblique"] = "Helvetica-Oblique";
        FontNames["HelveticaBoldOblique"] = "Helvetica-BoldOblique";
        FontNames["TimesRoman"] = "Times-Roman";
        FontNames["TimesRomanBold"] = "Times-Bold";
        FontNames["TimesRomanItalic"] = "Times-Italic";
        FontNames["TimesRomanBoldItalic"] = "Times-BoldItalic";
        FontNames["Symbol"] = "Symbol";
        FontNames["ZapfDingbats"] = "ZapfDingbats";
    })(FontNames || (FontNames = {}));
    var fontCache = {};
    var Font = /** @class */ (function () {
        function Font() {
            var _this = this;
            this.getWidthOfGlyph = function (glyphName) {
                return _this.CharWidths[glyphName];
            };
            this.getXAxisKerningForPair = function (leftGlyphName, rightGlyphName) {
                return (_this.KernPairXAmounts[leftGlyphName] || {})[rightGlyphName];
            };
        }
        Font.load = function (fontName) {
            var cachedFont = fontCache[fontName];
            if (cachedFont)
                return cachedFont;
            var json = decompressJson(compressedJsonForFontName[fontName]);
            var font = Object.assign(new Font(), JSON.parse(json));
            font.CharWidths = font.CharMetrics.reduce(function (acc, metric) {
                acc[metric.N] = metric.WX;
                return acc;
            }, {});
            font.KernPairXAmounts = font.KernPairs.reduce(function (acc, _a) {
                var name1 = _a[0], name2 = _a[1], width = _a[2];
                if (!acc[name1])
                    acc[name1] = {};
                acc[name1][name2] = width;
                return acc;
            }, {});
            fontCache[fontName] = font;
            return font;
        };
        return Font;
    }());

    var AllEncodingsCompressed = "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";

    /* tslint:disable max-classes-per-file */
    var decompressedEncodings = decompressJson(AllEncodingsCompressed);
    var allUnicodeMappings = JSON.parse(decompressedEncodings);
    var Encoding = /** @class */ (function () {
        function Encoding(name, unicodeMappings) {
            var _this = this;
            this.canEncodeUnicodeCodePoint = function (codePoint) {
                return codePoint in _this.unicodeMappings;
            };
            this.encodeUnicodeCodePoint = function (codePoint) {
                var mapped = _this.unicodeMappings[codePoint];
                if (!mapped) {
                    var str = String.fromCharCode(codePoint);
                    var msg = _this.name + " cannot encode \"" + str + "\"";
                    throw new Error(msg);
                }
                return { code: mapped[0], name: mapped[1] };
            };
            this.name = name;
            this.unicodeMappings = unicodeMappings;
        }
        return Encoding;
    }());
    var Encodings = {
        Symbol: new Encoding('Symbol', allUnicodeMappings.symbol),
        ZapfDingbats: new Encoding('ZapfDingbats', allUnicodeMappings.zapfdingbats),
        WinAnsi: new Encoding('WinAnsi', allUnicodeMappings.win1252),
    };

    var values = function (obj) { return Object.keys(obj).map(function (k) { return obj[k]; }); };
    var StandardFontValues = values(FontNames);
    var isStandardFont = function (input) {
        return StandardFontValues.includes(input);
    };
    //# sourceMappingURL=objects.js.map

    /* tslint:disable:ban-types */
    var backtick = function (val) { return "`" + val + "`"; };
    var getType = function (val) {
        if (val === null)
            return 'null';
        if (val === undefined)
            return 'undefined';
        if (typeof val === 'string')
            return 'string';
        if (isNaN(val))
            return 'NaN';
        if (typeof val === 'number')
            return 'number';
        if (typeof val === 'boolean')
            return 'boolean';
        if (typeof val === 'symbol')
            return 'symbol';
        if (typeof val === 'bigint')
            return 'bigint';
        if (val.constructor && val.constructor.name)
            return val.constructor.name;
        if (val.name)
            return val.name;
        if (val.constructor)
            return String(val.constructor);
        return String(val);
    };
    var isType = function (value, type) {
        if (type === 'null')
            return value === null;
        if (type === 'undefined')
            return value === undefined;
        if (type === 'string')
            return typeof value === 'string';
        if (type === 'number')
            return typeof value === 'number' && !isNaN(value);
        if (type === 'boolean')
            return typeof value === 'boolean';
        if (type === 'symbol')
            return typeof value === 'symbol';
        if (type === 'bigint')
            return typeof value === 'bigint';
        if (type === Array)
            return value instanceof Array;
        if (type === Uint8Array)
            return value instanceof Uint8Array;
        if (type === ArrayBuffer)
            return value instanceof ArrayBuffer;
        return value instanceof type[0];
    };
    var createTypeErrorMsg = function (value, valueName, types) {
        var allowedTypes = new Array(types.length);
        for (var idx = 0, len = types.length; idx < len; idx++) {
            var type = types[idx];
            if (type === 'null')
                allowedTypes[idx] = backtick('null');
            if (type === 'undefined')
                allowedTypes[idx] = backtick('undefined');
            if (type === 'string')
                allowedTypes[idx] = backtick('string');
            else if (type === 'number')
                allowedTypes[idx] = backtick('number');
            else if (type === 'boolean')
                allowedTypes[idx] = backtick('boolean');
            else if (type === 'symbol')
                allowedTypes[idx] = backtick('symbol');
            else if (type === 'bigint')
                allowedTypes[idx] = backtick('bigint');
            else if (type === Array)
                allowedTypes[idx] = backtick('Array');
            else if (type === Uint8Array)
                allowedTypes[idx] = backtick('Uint8Array');
            else if (type === ArrayBuffer)
                allowedTypes[idx] = backtick('ArrayBuffer');
            else
                allowedTypes[idx] = backtick(type[1]);
        }
        var joinedTypes = allowedTypes.join(' or ');
        // prettier-ignore
        return backtick(valueName) + " must be of type " + joinedTypes + ", but was actually of type " + backtick(getType(value));
    };
    var assertIs = function (value, valueName, types) {
        for (var idx = 0, len = types.length; idx < len; idx++) {
            if (isType(value, types[idx]))
                return;
        }
        throw new TypeError(createTypeErrorMsg(value, valueName, types));
    };
    var assertOrUndefined = function (value, valueName, types) {
        assertIs(value, valueName, types.concat('undefined'));
    };
    var assertEachIs = function (values, valueName, types) {
        for (var idx = 0, len = values.length; idx < len; idx++) {
            assertIs(values[idx], valueName, types);
        }
    };
    var assertRange = function (value, valueName, min, max) {
        assertIs(value, valueName, ['number']);
        assertIs(min, 'min', ['number']);
        assertIs(max, 'max', ['number']);
        max = Math.max(min, max);
        if (value < min || value > max) {
            // prettier-ignore
            throw new Error(backtick(valueName) + " must be at least " + min + " and at most " + max + ", but was actually " + value);
        }
    };
    var assertMultiple = function (value, valueName, multiplier) {
        assertIs(value, valueName, ['number']);
        if (value % multiplier !== 0) {
            // prettier-ignore
            throw new Error(backtick(valueName) + " must be a multiple of " + multiplier + ", but was actually " + value);
        }
    };
    //# sourceMappingURL=validators.js.map

    var Cache = /** @class */ (function () {
        function Cache(populate) {
            this.populate = populate;
            this.value = undefined;
        }
        Cache.prototype.access = function () {
            if (!this.value)
                this.value = this.populate();
            return this.value;
        };
        Cache.prototype.invalidate = function () {
            this.value = undefined;
        };
        Cache.populatedBy = function (populate) { return new Cache(populate); };
        return Cache;
    }());
    //# sourceMappingURL=Cache.js.map

    var MethodNotImplementedError = /** @class */ (function (_super) {
        __extends(MethodNotImplementedError, _super);
        function MethodNotImplementedError(className, methodName) {
            var _this = this;
            var msg = "Method " + className + "." + methodName + "() not implemented";
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return MethodNotImplementedError;
    }(Error));
    var PrivateConstructorError = /** @class */ (function (_super) {
        __extends(PrivateConstructorError, _super);
        function PrivateConstructorError(className) {
            var _this = this;
            var msg = "Cannot construct " + className + " - it has a private constructor";
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return PrivateConstructorError;
    }(Error));
    var UnexpectedObjectTypeError = /** @class */ (function (_super) {
        __extends(UnexpectedObjectTypeError, _super);
        function UnexpectedObjectTypeError(expected, actual) {
            var _this = this;
            var expectedTypes = Array.isArray(expected)
                ? expected.map(function (_a) {
                    var name = _a.name;
                    return name;
                })
                : [expected.name];
            var msg = "Expected instance of " + expectedTypes.join(' or ') + ", " +
                ("but got instance of " + (actual ? actual.constructor.name : actual));
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return UnexpectedObjectTypeError;
    }(Error));
    var UnsupportedEncodingError = /** @class */ (function (_super) {
        __extends(UnsupportedEncodingError, _super);
        function UnsupportedEncodingError(encoding) {
            var _this = this;
            var msg = encoding + " stream encoding not supported";
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return UnsupportedEncodingError;
    }(Error));
    var ReparseError = /** @class */ (function (_super) {
        __extends(ReparseError, _super);
        function ReparseError(className, methodName) {
            var _this = this;
            var msg = "Cannot call " + className + "." + methodName + "() more than once";
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return ReparseError;
    }(Error));
    var MissingCatalogError = /** @class */ (function (_super) {
        __extends(MissingCatalogError, _super);
        function MissingCatalogError(ref) {
            var _this = this;
            var msg = "Missing catalog (ref=" + ref + ")";
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return MissingCatalogError;
    }(Error));
    var MissingPageContentsEmbeddingError = /** @class */ (function (_super) {
        __extends(MissingPageContentsEmbeddingError, _super);
        function MissingPageContentsEmbeddingError() {
            var _this = this;
            var msg = "Can't embed page with missing Contents";
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return MissingPageContentsEmbeddingError;
    }(Error));
    var UnrecognizedStreamTypeError = /** @class */ (function (_super) {
        __extends(UnrecognizedStreamTypeError, _super);
        function UnrecognizedStreamTypeError(stream) {
            var _a, _b, _c, _d, _e;
            var _this = this;
            var streamType = (_e = (_c = (_b = (_a = stream) === null || _a === void 0 ? void 0 : _a.contructor) === null || _b === void 0 ? void 0 : _b.name, (_c !== null && _c !== void 0 ? _c : (_d = stream) === null || _d === void 0 ? void 0 : _d.name)), (_e !== null && _e !== void 0 ? _e : stream));
            var msg = "Unrecognized stream type: " + streamType;
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return UnrecognizedStreamTypeError;
    }(Error));
    var PageEmbeddingMismatchedContextError = /** @class */ (function (_super) {
        __extends(PageEmbeddingMismatchedContextError, _super);
        function PageEmbeddingMismatchedContextError() {
            var _this = this;
            var msg = "Found mismatched contexts while embedding pages. All pages in the array passed to `PDFDocument.embedPages()` must be from the same document.";
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return PageEmbeddingMismatchedContextError;
    }(Error));
    var NumberParsingError = /** @class */ (function (_super) {
        __extends(NumberParsingError, _super);
        function NumberParsingError(pos, value) {
            var _this = this;
            var msg = "Failed to parse number " +
                ("(line:" + pos.line + " col:" + pos.column + " offset=" + pos.offset + "): \"" + value + "\"");
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return NumberParsingError;
    }(Error));
    var PDFParsingError = /** @class */ (function (_super) {
        __extends(PDFParsingError, _super);
        function PDFParsingError(pos, details) {
            var _this = this;
            var msg = "Failed to parse PDF document " +
                ("(line:" + pos.line + " col:" + pos.column + " offset=" + pos.offset + "): " + details);
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return PDFParsingError;
    }(Error));
    var NextByteAssertionError = /** @class */ (function (_super) {
        __extends(NextByteAssertionError, _super);
        function NextByteAssertionError(pos, expectedByte, actualByte) {
            var _this = this;
            var msg = "Expected next byte to be " + expectedByte + " but it was actually " + actualByte;
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return NextByteAssertionError;
    }(PDFParsingError));
    var PDFObjectParsingError = /** @class */ (function (_super) {
        __extends(PDFObjectParsingError, _super);
        function PDFObjectParsingError(pos, byte) {
            var _this = this;
            var msg = "Failed to parse PDF object starting with the following byte: " + byte;
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return PDFObjectParsingError;
    }(PDFParsingError));
    var PDFInvalidObjectParsingError = /** @class */ (function (_super) {
        __extends(PDFInvalidObjectParsingError, _super);
        function PDFInvalidObjectParsingError(pos) {
            var _this = this;
            var msg = "Failed to parse invalid PDF object";
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return PDFInvalidObjectParsingError;
    }(PDFParsingError));
    var PDFStreamParsingError = /** @class */ (function (_super) {
        __extends(PDFStreamParsingError, _super);
        function PDFStreamParsingError(pos) {
            var _this = this;
            var msg = "Failed to parse PDF stream";
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return PDFStreamParsingError;
    }(PDFParsingError));
    var UnbalancedParenthesisError = /** @class */ (function (_super) {
        __extends(UnbalancedParenthesisError, _super);
        function UnbalancedParenthesisError(pos) {
            var _this = this;
            var msg = "Failed to parse PDF literal string due to unbalanced parenthesis";
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return UnbalancedParenthesisError;
    }(PDFParsingError));
    var StalledParserError = /** @class */ (function (_super) {
        __extends(StalledParserError, _super);
        function StalledParserError(pos) {
            var _this = this;
            var msg = "Parser stalled";
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return StalledParserError;
    }(PDFParsingError));
    var MissingPDFHeaderError = /** @class */ (function (_super) {
        __extends(MissingPDFHeaderError, _super);
        function MissingPDFHeaderError(pos) {
            var _this = this;
            var msg = "No PDF header found";
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return MissingPDFHeaderError;
    }(PDFParsingError));
    var MissingKeywordError = /** @class */ (function (_super) {
        __extends(MissingKeywordError, _super);
        function MissingKeywordError(pos, keyword) {
            var _this = this;
            var msg = "Did not find expected keyword '" + arrayAsString(keyword) + "'";
            _this = _super.call(this, pos, msg) || this;
            return _this;
        }
        return MissingKeywordError;
    }(PDFParsingError));
    //# sourceMappingURL=errors.js.map

    var CharCodes;
    (function (CharCodes) {
        CharCodes[CharCodes["Null"] = 0] = "Null";
        CharCodes[CharCodes["Tab"] = 9] = "Tab";
        CharCodes[CharCodes["Newline"] = 10] = "Newline";
        CharCodes[CharCodes["FormFeed"] = 12] = "FormFeed";
        CharCodes[CharCodes["CarriageReturn"] = 13] = "CarriageReturn";
        CharCodes[CharCodes["Space"] = 32] = "Space";
        CharCodes[CharCodes["ExclamationPoint"] = 33] = "ExclamationPoint";
        CharCodes[CharCodes["Hash"] = 35] = "Hash";
        CharCodes[CharCodes["Percent"] = 37] = "Percent";
        CharCodes[CharCodes["LeftParen"] = 40] = "LeftParen";
        CharCodes[CharCodes["RightParen"] = 41] = "RightParen";
        CharCodes[CharCodes["Plus"] = 43] = "Plus";
        CharCodes[CharCodes["Minus"] = 45] = "Minus";
        CharCodes[CharCodes["Dash"] = 45] = "Dash";
        CharCodes[CharCodes["Period"] = 46] = "Period";
        CharCodes[CharCodes["ForwardSlash"] = 47] = "ForwardSlash";
        CharCodes[CharCodes["Zero"] = 48] = "Zero";
        CharCodes[CharCodes["One"] = 49] = "One";
        CharCodes[CharCodes["Two"] = 50] = "Two";
        CharCodes[CharCodes["Three"] = 51] = "Three";
        CharCodes[CharCodes["Four"] = 52] = "Four";
        CharCodes[CharCodes["Five"] = 53] = "Five";
        CharCodes[CharCodes["Six"] = 54] = "Six";
        CharCodes[CharCodes["Seven"] = 55] = "Seven";
        CharCodes[CharCodes["Eight"] = 56] = "Eight";
        CharCodes[CharCodes["Nine"] = 57] = "Nine";
        CharCodes[CharCodes["LessThan"] = 60] = "LessThan";
        CharCodes[CharCodes["GreaterThan"] = 62] = "GreaterThan";
        CharCodes[CharCodes["A"] = 65] = "A";
        CharCodes[CharCodes["D"] = 68] = "D";
        CharCodes[CharCodes["E"] = 69] = "E";
        CharCodes[CharCodes["F"] = 70] = "F";
        CharCodes[CharCodes["O"] = 79] = "O";
        CharCodes[CharCodes["P"] = 80] = "P";
        CharCodes[CharCodes["R"] = 82] = "R";
        CharCodes[CharCodes["LeftSquareBracket"] = 91] = "LeftSquareBracket";
        CharCodes[CharCodes["BackSlash"] = 92] = "BackSlash";
        CharCodes[CharCodes["RightSquareBracket"] = 93] = "RightSquareBracket";
        CharCodes[CharCodes["a"] = 97] = "a";
        CharCodes[CharCodes["b"] = 98] = "b";
        CharCodes[CharCodes["d"] = 100] = "d";
        CharCodes[CharCodes["e"] = 101] = "e";
        CharCodes[CharCodes["f"] = 102] = "f";
        CharCodes[CharCodes["i"] = 105] = "i";
        CharCodes[CharCodes["j"] = 106] = "j";
        CharCodes[CharCodes["l"] = 108] = "l";
        CharCodes[CharCodes["m"] = 109] = "m";
        CharCodes[CharCodes["n"] = 110] = "n";
        CharCodes[CharCodes["o"] = 111] = "o";
        CharCodes[CharCodes["r"] = 114] = "r";
        CharCodes[CharCodes["s"] = 115] = "s";
        CharCodes[CharCodes["t"] = 116] = "t";
        CharCodes[CharCodes["u"] = 117] = "u";
        CharCodes[CharCodes["x"] = 120] = "x";
        CharCodes[CharCodes["LeftCurly"] = 123] = "LeftCurly";
        CharCodes[CharCodes["RightCurly"] = 125] = "RightCurly";
        CharCodes[CharCodes["Tilde"] = 126] = "Tilde";
    })(CharCodes || (CharCodes = {}));
    var CharCodes$1 = CharCodes;
    //# sourceMappingURL=CharCodes.js.map

    var PDFHeader = /** @class */ (function () {
        function PDFHeader(major, minor) {
            this.major = String(major);
            this.minor = String(minor);
        }
        PDFHeader.prototype.toString = function () {
            var bc = charFromCode(129);
            return "%PDF-" + this.major + "." + this.minor + "\n%" + bc + bc + bc + bc;
        };
        PDFHeader.prototype.sizeInBytes = function () {
            return 12 + this.major.length + this.minor.length;
        };
        PDFHeader.prototype.copyBytesInto = function (buffer, offset) {
            var initialOffset = offset;
            buffer[offset++] = CharCodes$1.Percent;
            buffer[offset++] = CharCodes$1.P;
            buffer[offset++] = CharCodes$1.D;
            buffer[offset++] = CharCodes$1.F;
            buffer[offset++] = CharCodes$1.Dash;
            offset += copyStringIntoBuffer(this.major, buffer, offset);
            buffer[offset++] = CharCodes$1.Period;
            offset += copyStringIntoBuffer(this.minor, buffer, offset);
            buffer[offset++] = CharCodes$1.Newline;
            buffer[offset++] = CharCodes$1.Percent;
            buffer[offset++] = 129;
            buffer[offset++] = 129;
            buffer[offset++] = 129;
            buffer[offset++] = 129;
            return offset - initialOffset;
        };
        PDFHeader.forVersion = function (major, minor) {
            return new PDFHeader(major, minor);
        };
        return PDFHeader;
    }());
    //# sourceMappingURL=PDFHeader.js.map

    var PDFObject = /** @class */ (function () {
        function PDFObject() {
        }
        PDFObject.prototype.clone = function (_context) {
            throw new MethodNotImplementedError(this.constructor.name, 'clone');
        };
        PDFObject.prototype.toString = function () {
            throw new MethodNotImplementedError(this.constructor.name, 'toString');
        };
        PDFObject.prototype.sizeInBytes = function () {
            throw new MethodNotImplementedError(this.constructor.name, 'sizeInBytes');
        };
        PDFObject.prototype.copyBytesInto = function (_buffer, _offset) {
            throw new MethodNotImplementedError(this.constructor.name, 'copyBytesInto');
        };
        return PDFObject;
    }());
    //# sourceMappingURL=PDFObject.js.map

    var PDFArray = /** @class */ (function (_super) {
        __extends(PDFArray, _super);
        function PDFArray(context) {
            var _this = _super.call(this) || this;
            _this.array = [];
            _this.context = context;
            return _this;
        }
        PDFArray.prototype.size = function () {
            return this.array.length;
        };
        PDFArray.prototype.push = function (object) {
            this.array.push(object);
        };
        PDFArray.prototype.insert = function (index, object) {
            this.array.splice(index, 0, object);
        };
        PDFArray.prototype.remove = function (index) {
            this.array.splice(index, 1);
        };
        PDFArray.prototype.set = function (idx, object) {
            this.array[idx] = object;
        };
        PDFArray.prototype.get = function (index) {
            return this.array[index];
        };
        PDFArray.prototype.lookupMaybe = function (index, type) {
            return this.context.lookupMaybe(this.get(index), type);
        };
        PDFArray.prototype.lookup = function (index, type) {
            return this.context.lookup(this.get(index), type);
        };
        PDFArray.prototype.clone = function (context) {
            var clone = PDFArray.withContext(context || this.context);
            for (var idx = 0, len = this.size(); idx < len; idx++) {
                clone.push(this.array[idx]);
            }
            return clone;
        };
        PDFArray.prototype.toString = function () {
            var arrayString = '[ ';
            for (var idx = 0, len = this.size(); idx < len; idx++) {
                arrayString += this.get(idx).toString();
                arrayString += ' ';
            }
            arrayString += ']';
            return arrayString;
        };
        PDFArray.prototype.sizeInBytes = function () {
            var size = 3;
            for (var idx = 0, len = this.size(); idx < len; idx++) {
                size += this.get(idx).sizeInBytes() + 1;
            }
            return size;
        };
        PDFArray.prototype.copyBytesInto = function (buffer, offset) {
            var initialOffset = offset;
            buffer[offset++] = CharCodes$1.LeftSquareBracket;
            buffer[offset++] = CharCodes$1.Space;
            for (var idx = 0, len = this.size(); idx < len; idx++) {
                offset += this.get(idx).copyBytesInto(buffer, offset);
                buffer[offset++] = CharCodes$1.Space;
            }
            buffer[offset++] = CharCodes$1.RightSquareBracket;
            return offset - initialOffset;
        };
        PDFArray.withContext = function (context) { return new PDFArray(context); };
        return PDFArray;
    }(PDFObject));
    //# sourceMappingURL=PDFArray.js.map

    var ENFORCER = {};
    var PDFBool = /** @class */ (function (_super) {
        __extends(PDFBool, _super);
        function PDFBool(enforcer, value) {
            var _this = this;
            if (enforcer !== ENFORCER)
                throw new PrivateConstructorError('PDFBool');
            _this = _super.call(this) || this;
            _this.value = value;
            return _this;
        }
        PDFBool.prototype.clone = function () {
            return this;
        };
        PDFBool.prototype.toString = function () {
            return String(this.value);
        };
        PDFBool.prototype.sizeInBytes = function () {
            return this.value ? 4 : 5;
        };
        PDFBool.prototype.copyBytesInto = function (buffer, offset) {
            if (this.value) {
                buffer[offset++] = CharCodes$1.t;
                buffer[offset++] = CharCodes$1.r;
                buffer[offset++] = CharCodes$1.u;
                buffer[offset++] = CharCodes$1.e;
                return 4;
            }
            else {
                buffer[offset++] = CharCodes$1.f;
                buffer[offset++] = CharCodes$1.a;
                buffer[offset++] = CharCodes$1.l;
                buffer[offset++] = CharCodes$1.s;
                buffer[offset++] = CharCodes$1.e;
                return 5;
            }
        };
        PDFBool.True = new PDFBool(ENFORCER, true);
        PDFBool.False = new PDFBool(ENFORCER, false);
        return PDFBool;
    }(PDFObject));
    //# sourceMappingURL=PDFBool.js.map

    var PDFDict = /** @class */ (function (_super) {
        __extends(PDFDict, _super);
        function PDFDict(map, context) {
            var _this = _super.call(this) || this;
            _this.dict = map;
            _this.context = context;
            return _this;
        }
        PDFDict.prototype.entries = function () {
            return Array.from(this.dict.entries());
        };
        PDFDict.prototype.set = function (key, value) {
            this.dict.set(key, value);
        };
        PDFDict.prototype.get = function (key) {
            return this.dict.get(key);
        };
        PDFDict.prototype.has = function (key) {
            return this.dict.has(key);
        };
        PDFDict.prototype.lookupMaybe = function (key, type) {
            return this.context.lookupMaybe(this.get(key), type);
        };
        PDFDict.prototype.lookup = function (key, type) {
            return this.context.lookup(this.get(key), type);
        };
        PDFDict.prototype.delete = function (key) {
            return this.dict.delete(key);
        };
        PDFDict.prototype.clone = function (context) {
            var clone = PDFDict.withContext(context || this.context);
            var entries = this.entries();
            for (var idx = 0, len = entries.length; idx < len; idx++) {
                var _a = entries[idx], key = _a[0], value = _a[1];
                clone.set(key, value);
            }
            return clone;
        };
        PDFDict.prototype.toString = function () {
            var dictString = '<<\n';
            var entries = this.entries();
            for (var idx = 0, len = entries.length; idx < len; idx++) {
                var _a = entries[idx], key = _a[0], value = _a[1];
                dictString += key.toString() + ' ' + value.toString() + '\n';
            }
            dictString += '>>';
            return dictString;
        };
        PDFDict.prototype.sizeInBytes = function () {
            var size = 5;
            var entries = this.entries();
            for (var idx = 0, len = entries.length; idx < len; idx++) {
                var _a = entries[idx], key = _a[0], value = _a[1];
                size += key.sizeInBytes() + value.sizeInBytes() + 2;
            }
            return size;
        };
        PDFDict.prototype.copyBytesInto = function (buffer, offset) {
            var initialOffset = offset;
            buffer[offset++] = CharCodes$1.LessThan;
            buffer[offset++] = CharCodes$1.LessThan;
            buffer[offset++] = CharCodes$1.Newline;
            var entries = this.entries();
            for (var idx = 0, len = entries.length; idx < len; idx++) {
                var _a = entries[idx], key = _a[0], value = _a[1];
                offset += key.copyBytesInto(buffer, offset);
                buffer[offset++] = CharCodes$1.Space;
                offset += value.copyBytesInto(buffer, offset);
                buffer[offset++] = CharCodes$1.Newline;
            }
            buffer[offset++] = CharCodes$1.GreaterThan;
            buffer[offset++] = CharCodes$1.GreaterThan;
            return offset - initialOffset;
        };
        PDFDict.withContext = function (context) { return new PDFDict(new Map(), context); };
        PDFDict.fromMapWithContext = function (map, context) {
            return new PDFDict(map, context);
        };
        return PDFDict;
    }(PDFObject));
    //# sourceMappingURL=PDFDict.js.map

    var IsDelimiter = new Uint8Array(256);
    IsDelimiter[CharCodes$1.LeftParen] = 1;
    IsDelimiter[CharCodes$1.RightParen] = 1;
    IsDelimiter[CharCodes$1.LessThan] = 1;
    IsDelimiter[CharCodes$1.GreaterThan] = 1;
    IsDelimiter[CharCodes$1.LeftSquareBracket] = 1;
    IsDelimiter[CharCodes$1.RightSquareBracket] = 1;
    IsDelimiter[CharCodes$1.LeftCurly] = 1;
    IsDelimiter[CharCodes$1.RightCurly] = 1;
    IsDelimiter[CharCodes$1.ForwardSlash] = 1;
    IsDelimiter[CharCodes$1.Percent] = 1;
    //# sourceMappingURL=Delimiters.js.map

    var IsWhitespace = new Uint8Array(256);
    IsWhitespace[CharCodes$1.Null] = 1;
    IsWhitespace[CharCodes$1.Tab] = 1;
    IsWhitespace[CharCodes$1.Newline] = 1;
    IsWhitespace[CharCodes$1.FormFeed] = 1;
    IsWhitespace[CharCodes$1.CarriageReturn] = 1;
    IsWhitespace[CharCodes$1.Space] = 1;
    //# sourceMappingURL=Whitespace.js.map

    var IsIrregular = new Uint8Array(256);
    for (var idx = 0, len = 256; idx < len; idx++) {
        IsIrregular[idx] = IsWhitespace[idx] || IsDelimiter[idx] ? 1 : 0;
    }
    IsIrregular[CharCodes$1.Hash] = 1;
    //# sourceMappingURL=Irregular.js.map

    var decodeName = function (name) {
        return name.replace(/#([\dABCDEF]{2})/g, function (_, hex) { return charFromHexCode(hex); });
    };
    var isRegularChar = function (charCode) {
        return charCode >= CharCodes$1.ExclamationPoint &&
            charCode <= CharCodes$1.Tilde &&
            !IsIrregular[charCode];
    };
    var ENFORCER$1 = {};
    var pool = new Map();
    var PDFName = /** @class */ (function (_super) {
        __extends(PDFName, _super);
        function PDFName(enforcer, name) {
            var _this = this;
            if (enforcer !== ENFORCER$1)
                throw new PrivateConstructorError('PDFName');
            _this = _super.call(this) || this;
            var encodedName = '/';
            for (var idx = 0, len = name.length; idx < len; idx++) {
                var character = name[idx];
                var code = toCharCode(character);
                encodedName += isRegularChar(code) ? character : "#" + toHexString(code);
            }
            _this.encodedName = encodedName;
            return _this;
        }
        PDFName.prototype.value = function () {
            return this.encodedName;
        };
        PDFName.prototype.clone = function () {
            return this;
        };
        PDFName.prototype.toString = function () {
            return this.encodedName;
        };
        PDFName.prototype.sizeInBytes = function () {
            return this.encodedName.length;
        };
        PDFName.prototype.copyBytesInto = function (buffer, offset) {
            offset += copyStringIntoBuffer(this.encodedName, buffer, offset);
            return this.encodedName.length;
        };
        PDFName.of = function (name) {
            var decodedValue = decodeName(name);
            var instance = pool.get(decodedValue);
            if (!instance) {
                instance = new PDFName(ENFORCER$1, decodedValue);
                pool.set(decodedValue, instance);
            }
            return instance;
        };
        /* tslint:disable member-ordering */
        PDFName.Length = PDFName.of('Length');
        PDFName.FlateDecode = PDFName.of('FlateDecode');
        PDFName.Resources = PDFName.of('Resources');
        PDFName.Font = PDFName.of('Font');
        PDFName.XObject = PDFName.of('XObject');
        PDFName.Contents = PDFName.of('Contents');
        PDFName.Type = PDFName.of('Type');
        PDFName.Parent = PDFName.of('Parent');
        PDFName.MediaBox = PDFName.of('MediaBox');
        PDFName.Page = PDFName.of('Page');
        PDFName.Annots = PDFName.of('Annots');
        PDFName.TrimBox = PDFName.of('TrimBox');
        PDFName.BleedBox = PDFName.of('BleedBox');
        PDFName.CropBox = PDFName.of('CropBox');
        PDFName.Rotate = PDFName.of('Rotate');
        return PDFName;
    }(PDFObject));
    //# sourceMappingURL=PDFName.js.map

    var PDFNull = /** @class */ (function (_super) {
        __extends(PDFNull, _super);
        function PDFNull() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PDFNull.prototype.clone = function () {
            return this;
        };
        PDFNull.prototype.toString = function () {
            return 'null';
        };
        PDFNull.prototype.sizeInBytes = function () {
            return 4;
        };
        PDFNull.prototype.copyBytesInto = function (buffer, offset) {
            buffer[offset++] = CharCodes$1.n;
            buffer[offset++] = CharCodes$1.u;
            buffer[offset++] = CharCodes$1.l;
            buffer[offset++] = CharCodes$1.l;
            return 4;
        };
        return PDFNull;
    }(PDFObject));
    var PDFNull$1 = new PDFNull();
    //# sourceMappingURL=PDFNull.js.map

    var PDFNumber = /** @class */ (function (_super) {
        __extends(PDFNumber, _super);
        function PDFNumber(value) {
            var _this = _super.call(this) || this;
            _this.numberValue = value;
            _this.stringValue = numberToString(value);
            return _this;
        }
        PDFNumber.prototype.value = function () {
            return this.numberValue;
        };
        PDFNumber.prototype.clone = function () {
            return PDFNumber.of(this.numberValue);
        };
        PDFNumber.prototype.toString = function () {
            return this.stringValue;
        };
        PDFNumber.prototype.sizeInBytes = function () {
            return this.stringValue.length;
        };
        PDFNumber.prototype.copyBytesInto = function (buffer, offset) {
            offset += copyStringIntoBuffer(this.stringValue, buffer, offset);
            return this.stringValue.length;
        };
        PDFNumber.of = function (value) { return new PDFNumber(value); };
        return PDFNumber;
    }(PDFObject));
    //# sourceMappingURL=PDFNumber.js.map

    var PDFStream = /** @class */ (function (_super) {
        __extends(PDFStream, _super);
        function PDFStream(dict) {
            var _this = _super.call(this) || this;
            _this.dict = dict;
            return _this;
        }
        PDFStream.prototype.clone = function (_context) {
            throw new MethodNotImplementedError(this.constructor.name, 'clone');
        };
        PDFStream.prototype.getContentsString = function () {
            throw new MethodNotImplementedError(this.constructor.name, 'getContentsString');
        };
        PDFStream.prototype.getContents = function () {
            throw new MethodNotImplementedError(this.constructor.name, 'getContents');
        };
        PDFStream.prototype.getContentsSize = function () {
            throw new MethodNotImplementedError(this.constructor.name, 'getContentsSize');
        };
        PDFStream.prototype.updateDict = function () {
            var contentsSize = this.getContentsSize();
            this.dict.set(PDFName.Length, PDFNumber.of(contentsSize));
        };
        PDFStream.prototype.sizeInBytes = function () {
            this.updateDict();
            return this.dict.sizeInBytes() + this.getContentsSize() + 18;
        };
        PDFStream.prototype.toString = function () {
            this.updateDict();
            var streamString = this.dict.toString();
            streamString += '\nstream\n';
            streamString += this.getContentsString();
            streamString += '\nendstream';
            return streamString;
        };
        PDFStream.prototype.copyBytesInto = function (buffer, offset) {
            this.updateDict();
            var initialOffset = offset;
            offset += this.dict.copyBytesInto(buffer, offset);
            buffer[offset++] = CharCodes$1.Newline;
            buffer[offset++] = CharCodes$1.s;
            buffer[offset++] = CharCodes$1.t;
            buffer[offset++] = CharCodes$1.r;
            buffer[offset++] = CharCodes$1.e;
            buffer[offset++] = CharCodes$1.a;
            buffer[offset++] = CharCodes$1.m;
            buffer[offset++] = CharCodes$1.Newline;
            var contents = this.getContents();
            for (var idx = 0, len = contents.length; idx < len; idx++) {
                buffer[offset++] = contents[idx];
            }
            buffer[offset++] = CharCodes$1.Newline;
            buffer[offset++] = CharCodes$1.e;
            buffer[offset++] = CharCodes$1.n;
            buffer[offset++] = CharCodes$1.d;
            buffer[offset++] = CharCodes$1.s;
            buffer[offset++] = CharCodes$1.t;
            buffer[offset++] = CharCodes$1.r;
            buffer[offset++] = CharCodes$1.e;
            buffer[offset++] = CharCodes$1.a;
            buffer[offset++] = CharCodes$1.m;
            return offset - initialOffset;
        };
        return PDFStream;
    }(PDFObject));
    //# sourceMappingURL=PDFStream.js.map

    var PDFRawStream = /** @class */ (function (_super) {
        __extends(PDFRawStream, _super);
        function PDFRawStream(dict, contents) {
            var _this = _super.call(this, dict) || this;
            _this.contents = contents;
            return _this;
        }
        PDFRawStream.prototype.clone = function (context) {
            return PDFRawStream.of(this.dict.clone(context), this.contents.slice());
        };
        PDFRawStream.prototype.getContentsString = function () {
            return arrayAsString(this.contents);
        };
        PDFRawStream.prototype.getContents = function () {
            return this.contents;
        };
        PDFRawStream.prototype.getContentsSize = function () {
            return this.contents.length;
        };
        PDFRawStream.of = function (dict, contents) {
            return new PDFRawStream(dict, contents);
        };
        return PDFRawStream;
    }(PDFStream));
    //# sourceMappingURL=PDFRawStream.js.map

    var ENFORCER$2 = {};
    var pool$1 = new Map();
    var PDFRef = /** @class */ (function (_super) {
        __extends(PDFRef, _super);
        function PDFRef(enforcer, objectNumber, generationNumber) {
            var _this = this;
            if (enforcer !== ENFORCER$2)
                throw new PrivateConstructorError('PDFRef');
            _this = _super.call(this) || this;
            _this.objectNumber = objectNumber;
            _this.generationNumber = generationNumber;
            _this.tag = objectNumber + " " + generationNumber + " R";
            return _this;
        }
        PDFRef.prototype.clone = function () {
            return this;
        };
        PDFRef.prototype.toString = function () {
            return this.tag;
        };
        PDFRef.prototype.sizeInBytes = function () {
            return this.tag.length;
        };
        PDFRef.prototype.copyBytesInto = function (buffer, offset) {
            offset += copyStringIntoBuffer(this.tag, buffer, offset);
            return this.tag.length;
        };
        PDFRef.of = function (objectNumber, generationNumber) {
            if (generationNumber === void 0) { generationNumber = 0; }
            var tag = objectNumber + " " + generationNumber + " R";
            var instance = pool$1.get(tag);
            if (!instance) {
                instance = new PDFRef(ENFORCER$2, objectNumber, generationNumber);
                pool$1.set(tag, instance);
            }
            return instance;
        };
        return PDFRef;
    }(PDFObject));
    //# sourceMappingURL=PDFRef.js.map

    var PDFOperator = /** @class */ (function () {
        function PDFOperator(name, args) {
            this.name = name;
            this.args = args || [];
        }
        PDFOperator.prototype.clone = function (context) {
            var args = new Array(this.args.length);
            for (var idx = 0, len = args.length; idx < len; idx++) {
                var arg = this.args[idx];
                args[idx] = arg instanceof PDFObject ? arg.clone(context) : arg;
            }
            return PDFOperator.of(this.name, args);
        };
        PDFOperator.prototype.toString = function () {
            var value = '';
            for (var idx = 0, len = this.args.length; idx < len; idx++) {
                value += String(this.args[idx]) + ' ';
            }
            value += this.name;
            return value;
        };
        PDFOperator.prototype.sizeInBytes = function () {
            var size = 0;
            for (var idx = 0, len = this.args.length; idx < len; idx++) {
                var arg = this.args[idx];
                size += (arg instanceof PDFObject ? arg.sizeInBytes() : arg.length) + 1;
            }
            size += this.name.length;
            return size;
        };
        PDFOperator.prototype.copyBytesInto = function (buffer, offset) {
            var initialOffset = offset;
            for (var idx = 0, len = this.args.length; idx < len; idx++) {
                var arg = this.args[idx];
                if (arg instanceof PDFObject) {
                    offset += arg.copyBytesInto(buffer, offset);
                }
                else {
                    offset += copyStringIntoBuffer(arg, buffer, offset);
                }
                buffer[offset++] = CharCodes$1.Space;
            }
            offset += copyStringIntoBuffer(this.name, buffer, offset);
            return offset - initialOffset;
        };
        PDFOperator.of = function (name, args) {
            return new PDFOperator(name, args);
        };
        return PDFOperator;
    }());
    //# sourceMappingURL=PDFOperator.js.map

    var PDFOperatorNames;
    (function (PDFOperatorNames) {
        // Non Stroking Color Operators
        PDFOperatorNames["NonStrokingColor"] = "sc";
        PDFOperatorNames["NonStrokingColorN"] = "scn";
        PDFOperatorNames["NonStrokingColorRgb"] = "rg";
        PDFOperatorNames["NonStrokingColorGray"] = "g";
        PDFOperatorNames["NonStrokingColorCmyk"] = "k";
        PDFOperatorNames["NonStrokingColorspace"] = "cs";
        // Stroking Color Operators
        PDFOperatorNames["StrokingColor"] = "SC";
        PDFOperatorNames["StrokingColorN"] = "SCN";
        PDFOperatorNames["StrokingColorRgb"] = "RG";
        PDFOperatorNames["StrokingColorGray"] = "G";
        PDFOperatorNames["StrokingColorCmyk"] = "K";
        PDFOperatorNames["StrokingColorspace"] = "CS";
        // Marked Content Operators
        PDFOperatorNames["BeginMarkedContentSequence"] = "BDC";
        PDFOperatorNames["BeginMarkedContent"] = "BMC";
        PDFOperatorNames["EndMarkedContent"] = "EMC";
        PDFOperatorNames["MarkedContentPointWithProps"] = "DP";
        PDFOperatorNames["MarkedContentPoint"] = "MP";
        PDFOperatorNames["DrawObject"] = "Do";
        // Graphics State Operators
        PDFOperatorNames["ConcatTransformationMatrix"] = "cm";
        PDFOperatorNames["PopGraphicsState"] = "Q";
        PDFOperatorNames["PushGraphicsState"] = "q";
        PDFOperatorNames["SetFlatness"] = "i";
        PDFOperatorNames["SetGraphicsStateParams"] = "gs";
        PDFOperatorNames["SetLineCapStyle"] = "J";
        PDFOperatorNames["SetLineDashPattern"] = "d";
        PDFOperatorNames["SetLineJoinStyle"] = "j";
        PDFOperatorNames["SetLineMiterLimit"] = "M";
        PDFOperatorNames["SetLineWidth"] = "w";
        PDFOperatorNames["SetTextMatrix"] = "Tm";
        PDFOperatorNames["SetRenderingIntent"] = "ri";
        // Graphics Operators
        PDFOperatorNames["AppendRectangle"] = "re";
        PDFOperatorNames["BeginInlineImage"] = "BI";
        PDFOperatorNames["BeginInlineImageData"] = "ID";
        PDFOperatorNames["EndInlineImage"] = "EI";
        PDFOperatorNames["ClipEvenOdd"] = "W*";
        PDFOperatorNames["ClipNonZero"] = "W";
        PDFOperatorNames["CloseAndStroke"] = "s";
        PDFOperatorNames["CloseFillEvenOddAndStroke"] = "b*";
        PDFOperatorNames["CloseFillNonZeroAndStroke"] = "b";
        PDFOperatorNames["ClosePath"] = "h";
        PDFOperatorNames["AppendBezierCurve"] = "c";
        PDFOperatorNames["CurveToReplicateFinalPoint"] = "y";
        PDFOperatorNames["CurveToReplicateInitialPoint"] = "v";
        PDFOperatorNames["EndPath"] = "n";
        PDFOperatorNames["FillEvenOddAndStroke"] = "B*";
        PDFOperatorNames["FillEvenOdd"] = "f*";
        PDFOperatorNames["FillNonZeroAndStroke"] = "B";
        PDFOperatorNames["FillNonZero"] = "f";
        PDFOperatorNames["LegacyFillNonZero"] = "F";
        PDFOperatorNames["LineTo"] = "l";
        PDFOperatorNames["MoveTo"] = "m";
        PDFOperatorNames["ShadingFill"] = "sh";
        PDFOperatorNames["StrokePath"] = "S";
        // Text Operators
        PDFOperatorNames["BeginText"] = "BT";
        PDFOperatorNames["EndText"] = "ET";
        PDFOperatorNames["MoveText"] = "Td";
        PDFOperatorNames["MoveTextSetLeading"] = "TD";
        PDFOperatorNames["NextLine"] = "T*";
        PDFOperatorNames["SetCharacterSpacing"] = "Tc";
        PDFOperatorNames["SetFontAndSize"] = "Tf";
        PDFOperatorNames["SetTextHorizontalScaling"] = "Tz";
        PDFOperatorNames["SetTextLineHeight"] = "TL";
        PDFOperatorNames["SetTextRenderingMode"] = "Tr";
        PDFOperatorNames["SetTextRise"] = "Ts";
        PDFOperatorNames["SetWordSpacing"] = "Tw";
        PDFOperatorNames["ShowText"] = "Tj";
        PDFOperatorNames["ShowTextAdjusted"] = "TJ";
        PDFOperatorNames["ShowTextLine"] = "'";
        PDFOperatorNames["ShowTextLineAndSpace"] = "\"";
        // Type3 Font Operators
        PDFOperatorNames["Type3D0"] = "d0";
        PDFOperatorNames["Type3D1"] = "d1";
        // Compatibility Section Operators
        PDFOperatorNames["BeginCompatibilitySection"] = "BX";
        PDFOperatorNames["EndCompatibilitySection"] = "EX";
    })(PDFOperatorNames || (PDFOperatorNames = {}));
    var Ops = PDFOperatorNames;
    //# sourceMappingURL=PDFOperatorNames.js.map

    var PDFFlateStream = /** @class */ (function (_super) {
        __extends(PDFFlateStream, _super);
        function PDFFlateStream(dict, encode) {
            var _this = _super.call(this, dict) || this;
            _this.computeContents = function () {
                var unencodedContents = _this.getUnencodedContents();
                return _this.encode ? pako_1.deflate(unencodedContents) : unencodedContents;
            };
            _this.encode = encode;
            if (encode)
                dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
            _this.contentsCache = Cache.populatedBy(_this.computeContents);
            return _this;
        }
        PDFFlateStream.prototype.getContents = function () {
            return this.contentsCache.access();
        };
        PDFFlateStream.prototype.getContentsSize = function () {
            return this.contentsCache.access().length;
        };
        PDFFlateStream.prototype.getUnencodedContents = function () {
            throw new MethodNotImplementedError(this.constructor.name, 'getUnencodedContents');
        };
        return PDFFlateStream;
    }(PDFStream));
    //# sourceMappingURL=PDFFlateStream.js.map

    var PDFContentStream = /** @class */ (function (_super) {
        __extends(PDFContentStream, _super);
        function PDFContentStream(dict, operators, encode) {
            if (encode === void 0) { encode = true; }
            var _this = _super.call(this, dict, encode) || this;
            _this.operators = operators;
            return _this;
        }
        PDFContentStream.prototype.push = function () {
            var _a;
            var operators = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                operators[_i] = arguments[_i];
            }
            (_a = this.operators).push.apply(_a, operators);
        };
        PDFContentStream.prototype.clone = function (context) {
            var operators = new Array(this.operators.length);
            for (var idx = 0, len = this.operators.length; idx < len; idx++) {
                operators[idx] = this.operators[idx].clone(context);
            }
            var _a = this, dict = _a.dict, encode = _a.encode;
            return PDFContentStream.of(dict.clone(context), operators, encode);
        };
        PDFContentStream.prototype.getContentsString = function () {
            var value = '';
            for (var idx = 0, len = this.operators.length; idx < len; idx++) {
                value += this.operators[idx] + "\n";
            }
            return value;
        };
        PDFContentStream.prototype.getUnencodedContents = function () {
            var buffer = new Uint8Array(this.getUnencodedContentsSize());
            var offset = 0;
            for (var idx = 0, len = this.operators.length; idx < len; idx++) {
                offset += this.operators[idx].copyBytesInto(buffer, offset);
                buffer[offset++] = CharCodes$1.Newline;
            }
            return buffer;
        };
        PDFContentStream.prototype.getUnencodedContentsSize = function () {
            var size = 0;
            for (var idx = 0, len = this.operators.length; idx < len; idx++) {
                size += this.operators[idx].sizeInBytes() + 1;
            }
            return size;
        };
        PDFContentStream.of = function (dict, operators, encode) {
            if (encode === void 0) { encode = true; }
            return new PDFContentStream(dict, operators, encode);
        };
        return PDFContentStream;
    }(PDFFlateStream));
    //# sourceMappingURL=PDFContentStream.js.map

    var byAscendingObjectNumber = function (_a, _b) {
        var a = _a[0];
        var b = _b[0];
        return a.objectNumber - b.objectNumber;
    };
    var PDFContext = /** @class */ (function () {
        function PDFContext() {
            this.largestObjectNumber = 0;
            this.header = PDFHeader.forVersion(1, 7);
            this.trailerInfo = {};
            this.indirectObjects = new Map();
        }
        PDFContext.prototype.assign = function (ref, object) {
            this.indirectObjects.set(ref, object);
            if (ref.objectNumber > this.largestObjectNumber) {
                this.largestObjectNumber = ref.objectNumber;
            }
        };
        PDFContext.prototype.nextRef = function () {
            this.largestObjectNumber += 1;
            return PDFRef.of(this.largestObjectNumber);
        };
        PDFContext.prototype.register = function (object) {
            var ref = this.nextRef();
            this.assign(ref, object);
            return ref;
        };
        PDFContext.prototype.delete = function (ref) {
            return this.indirectObjects.delete(ref);
        };
        PDFContext.prototype.lookupMaybe = function (ref, type) {
            var result = ref instanceof PDFRef ? this.indirectObjects.get(ref) : ref;
            if (result && !(result instanceof type)) {
                throw new UnexpectedObjectTypeError(type, result);
            }
            return result;
        };
        PDFContext.prototype.lookup = function (ref, type) {
            var result = ref instanceof PDFRef ? this.indirectObjects.get(ref) : ref;
            if (type && !(result instanceof type)) {
                throw new UnexpectedObjectTypeError(type, result);
            }
            return result;
        };
        PDFContext.prototype.enumerateIndirectObjects = function () {
            return Array.from(this.indirectObjects.entries()).sort(byAscendingObjectNumber);
        };
        PDFContext.prototype.obj = function (literal) {
            if (literal instanceof PDFObject) {
                return literal;
            }
            else if (literal === null || literal === undefined) {
                return PDFNull$1;
            }
            else if (typeof literal === 'string') {
                return PDFName.of(literal);
            }
            else if (typeof literal === 'number') {
                return PDFNumber.of(literal);
            }
            else if (typeof literal === 'boolean') {
                return literal ? PDFBool.True : PDFBool.False;
            }
            else if (Array.isArray(literal)) {
                var array = PDFArray.withContext(this);
                for (var idx = 0, len = literal.length; idx < len; idx++) {
                    array.push(this.obj(literal[idx]));
                }
                return array;
            }
            else {
                var dict = PDFDict.withContext(this);
                var keys = Object.keys(literal);
                for (var idx = 0, len = keys.length; idx < len; idx++) {
                    var key = keys[idx];
                    var value = literal[key];
                    if (value !== undefined)
                        dict.set(PDFName.of(key), this.obj(value));
                }
                return dict;
            }
        };
        PDFContext.prototype.stream = function (contents, dict) {
            if (dict === void 0) { dict = {}; }
            return PDFRawStream.of(this.obj(dict), typedArrayFor(contents));
        };
        PDFContext.prototype.flateStream = function (contents, dict) {
            if (dict === void 0) { dict = {}; }
            return this.stream(pako_1.deflate(typedArrayFor(contents)), __assign(__assign({}, dict), { Filter: 'FlateDecode' }));
        };
        /*
         * Reference to PDFContentStream that contains a single PDFOperator: `q`.
         * Used by [[PDFPageLeaf]] instances to ensure that when content streams are
         * added to a modified PDF, they start in the default, unchanged graphics
         * state.
         */
        PDFContext.prototype.getPushGraphicsStateContentStream = function () {
            if (this.pushGraphicsStateContentStreamRef) {
                return this.pushGraphicsStateContentStreamRef;
            }
            var dict = this.obj({});
            var op = PDFOperator.of(Ops.PushGraphicsState);
            var stream = PDFContentStream.of(dict, [op]);
            this.pushGraphicsStateContentStreamRef = this.register(stream);
            return this.pushGraphicsStateContentStreamRef;
        };
        /*
         * Reference to PDFContentStream that contains a single PDFOperator: `Q`.
         * Used by [[PDFPageLeaf]] instances to ensure that when content streams are
         * added to a modified PDF, they start in the default, unchanged graphics
         * state.
         */
        PDFContext.prototype.getPopGraphicsStateContentStream = function () {
            if (this.popGraphicsStateContentStreamRef) {
                return this.popGraphicsStateContentStreamRef;
            }
            var dict = this.obj({});
            var op = PDFOperator.of(Ops.PopGraphicsState);
            var stream = PDFContentStream.of(dict, [op]);
            this.popGraphicsStateContentStreamRef = this.register(stream);
            return this.popGraphicsStateContentStreamRef;
        };
        PDFContext.create = function () { return new PDFContext(); };
        return PDFContext;
    }());
    //# sourceMappingURL=PDFContext.js.map

    var PDFPageLeaf = /** @class */ (function (_super) {
        __extends(PDFPageLeaf, _super);
        function PDFPageLeaf(map, context, autoNormalizeCTM) {
            if (autoNormalizeCTM === void 0) { autoNormalizeCTM = true; }
            var _this = _super.call(this, map, context) || this;
            _this.normalized = false;
            _this.autoNormalizeCTM = autoNormalizeCTM;
            return _this;
        }
        PDFPageLeaf.prototype.clone = function (context) {
            var clone = PDFPageLeaf.fromMapWithContext(new Map(), context || this.context, this.autoNormalizeCTM);
            var entries = this.entries();
            for (var idx = 0, len = entries.length; idx < len; idx++) {
                var _a = entries[idx], key = _a[0], value = _a[1];
                clone.set(key, value);
            }
            return clone;
        };
        PDFPageLeaf.prototype.Parent = function () {
            return this.lookupMaybe(PDFName.Parent, PDFDict);
        };
        PDFPageLeaf.prototype.Contents = function () {
            return this.lookup(PDFName.of('Contents'));
        };
        PDFPageLeaf.prototype.Annots = function () {
            return this.lookupMaybe(PDFName.Annots, PDFArray);
        };
        PDFPageLeaf.prototype.BleedBox = function () {
            return this.lookupMaybe(PDFName.BleedBox, PDFArray);
        };
        PDFPageLeaf.prototype.TrimBox = function () {
            return this.lookupMaybe(PDFName.TrimBox, PDFArray);
        };
        PDFPageLeaf.prototype.Resources = function () {
            var dictOrRef = this.getInheritableAttribute(PDFName.Resources);
            return this.context.lookupMaybe(dictOrRef, PDFDict);
        };
        PDFPageLeaf.prototype.MediaBox = function () {
            var arrayOrRef = this.getInheritableAttribute(PDFName.MediaBox);
            return this.context.lookup(arrayOrRef, PDFArray);
        };
        PDFPageLeaf.prototype.CropBox = function () {
            var arrayOrRef = this.getInheritableAttribute(PDFName.CropBox);
            return this.context.lookupMaybe(arrayOrRef, PDFArray);
        };
        PDFPageLeaf.prototype.Rotate = function () {
            var numberOrRef = this.getInheritableAttribute(PDFName.Rotate);
            return this.context.lookupMaybe(numberOrRef, PDFNumber);
        };
        PDFPageLeaf.prototype.getInheritableAttribute = function (name) {
            var attribute;
            this.ascend(function (node) {
                if (!attribute)
                    attribute = node.get(name);
            });
            return attribute;
        };
        PDFPageLeaf.prototype.setParent = function (parentRef) {
            this.set(PDFName.Parent, parentRef);
        };
        PDFPageLeaf.prototype.addContentStream = function (contentStreamRef) {
            var Contents = this.normalizedEntries().Contents || this.context.obj([]);
            this.set(PDFName.Contents, Contents);
            Contents.push(contentStreamRef);
        };
        PDFPageLeaf.prototype.wrapContentStreams = function (startStream, endStream) {
            var Contents = this.Contents();
            if (Contents instanceof PDFArray) {
                Contents.insert(0, startStream);
                Contents.push(endStream);
                return true;
            }
            return false;
        };
        PDFPageLeaf.prototype.setFontDictionary = function (name, fontDictRef) {
            var Font = this.normalizedEntries().Font;
            Font.set(name, fontDictRef);
        };
        PDFPageLeaf.prototype.setXObject = function (name, xObjectRef) {
            var XObject = this.normalizedEntries().XObject;
            XObject.set(name, xObjectRef);
        };
        PDFPageLeaf.prototype.ascend = function (visitor) {
            visitor(this);
            var Parent = this.Parent();
            if (Parent)
                Parent.ascend(visitor);
        };
        PDFPageLeaf.prototype.normalize = function () {
            if (this.normalized)
                return;
            var context = this.context;
            var contentsRef = this.get(PDFName.Contents);
            var contents = this.context.lookup(contentsRef);
            if (contents instanceof PDFStream) {
                this.set(PDFName.Contents, context.obj([contentsRef]));
            }
            if (this.autoNormalizeCTM) {
                this.wrapContentStreams(this.context.getPushGraphicsStateContentStream(), this.context.getPopGraphicsStateContentStream());
            }
            // TODO: Clone `Resources` if it is inherited
            var dictOrRef = this.getInheritableAttribute(PDFName.Resources);
            var Resources = context.lookupMaybe(dictOrRef, PDFDict) || context.obj({});
            this.set(PDFName.Resources, Resources);
            // TODO: Clone `Font` if it is inherited
            var Font = Resources.lookupMaybe(PDFName.Font, PDFDict) || context.obj({});
            Resources.set(PDFName.Font, Font);
            // TODO: Clone `XObject` if it is inherited
            var XObject = Resources.lookupMaybe(PDFName.XObject, PDFDict) || context.obj({});
            Resources.set(PDFName.XObject, XObject);
            this.normalized = true;
        };
        PDFPageLeaf.prototype.normalizedEntries = function () {
            this.normalize();
            var Resources = this.Resources();
            var Contents = this.Contents();
            return {
                Resources: Resources,
                Contents: Contents,
                Font: Resources.lookup(PDFName.Font, PDFDict),
                XObject: Resources.lookup(PDFName.XObject, PDFDict),
            };
        };
        PDFPageLeaf.InheritableEntries = [
            'Resources',
            'MediaBox',
            'CropBox',
            'Rotate',
        ];
        PDFPageLeaf.withContextAndParent = function (context, parent) {
            var dict = new Map();
            dict.set(PDFName.Type, PDFName.Page);
            dict.set(PDFName.Parent, parent);
            dict.set(PDFName.Resources, context.obj({}));
            dict.set(PDFName.MediaBox, context.obj([0, 0, 612, 792]));
            return new PDFPageLeaf(dict, context, false);
        };
        PDFPageLeaf.fromMapWithContext = function (map, context, autoNormalizeCTM) {
            if (autoNormalizeCTM === void 0) { autoNormalizeCTM = true; }
            return new PDFPageLeaf(map, context, autoNormalizeCTM);
        };
        return PDFPageLeaf;
    }(PDFDict));
    //# sourceMappingURL=PDFPageLeaf.js.map

    /**
     * PDFObjectCopier copies PDFObjects from a src context to a dest context.
     * The primary use case for this is to copy pages between PDFs.
     *
     * _Copying_ an object with a PDFObjectCopier is different from _cloning_ an
     * object with its [[PDFObject.clone]] method:
     *
     * ```
     *   const src: PDFContext = ...
     *   const dest: PDFContext = ...
     *   const originalObject: PDFObject = ...
     *   const copiedObject = PDFObjectCopier.for(src, dest).copy(originalObject);
     *   const clonedObject = originalObject.clone();
     * ```
     *
     * Copying an object is equivalent to cloning it and then copying over any other
     * objects that it references. Note that only dictionaries, arrays, and streams
     * (or structures build from them) can contain indirect references to other
     * objects. Copying a PDFObject that is not a dictionary, array, or stream is
     * supported, but is equivalent to cloning it.
     */
    var PDFObjectCopier = /** @class */ (function () {
        function PDFObjectCopier(src, dest) {
            var _this = this;
            this.traversedObjects = new Map();
            // prettier-ignore
            this.copy = function (object) { return (object instanceof PDFPageLeaf ? _this.copyPDFPage(object)
                : object instanceof PDFDict ? _this.copyPDFDict(object)
                    : object instanceof PDFArray ? _this.copyPDFArray(object)
                        : object instanceof PDFStream ? _this.copyPDFStream(object)
                            : object instanceof PDFRef ? _this.copyPDFIndirectObject(object)
                                : object.clone()); };
            this.copyPDFPage = function (originalPage) {
                var clonedPage = originalPage.clone();
                // Move any entries that the originalPage is inheriting from its parent
                // tree nodes directly into originalPage so they are preserved during
                // the copy.
                var InheritableEntries = PDFPageLeaf.InheritableEntries;
                for (var idx = 0, len = InheritableEntries.length; idx < len; idx++) {
                    var key = PDFName.of(InheritableEntries[idx]);
                    var value = clonedPage.getInheritableAttribute(key);
                    if (!clonedPage.get(key) && value)
                        clonedPage.set(key, value);
                }
                // Remove the parent reference to prevent the whole donor document's page
                // tree from being copied when we only need a single page.
                clonedPage.delete(PDFName.of('Parent'));
                return _this.copyPDFDict(clonedPage);
            };
            this.copyPDFDict = function (originalDict) {
                if (_this.traversedObjects.has(originalDict)) {
                    return _this.traversedObjects.get(originalDict);
                }
                var clonedDict = originalDict.clone(_this.dest);
                _this.traversedObjects.set(originalDict, clonedDict);
                var entries = originalDict.entries();
                for (var idx = 0, len = entries.length; idx < len; idx++) {
                    var _a = entries[idx], key = _a[0], value = _a[1];
                    clonedDict.set(key, _this.copy(value));
                }
                return clonedDict;
            };
            this.copyPDFArray = function (originalArray) {
                if (_this.traversedObjects.has(originalArray)) {
                    return _this.traversedObjects.get(originalArray);
                }
                var clonedArray = originalArray.clone(_this.dest);
                _this.traversedObjects.set(originalArray, clonedArray);
                for (var idx = 0, len = originalArray.size(); idx < len; idx++) {
                    var value = originalArray.get(idx);
                    clonedArray.set(idx, _this.copy(value));
                }
                return clonedArray;
            };
            this.copyPDFStream = function (originalStream) {
                if (_this.traversedObjects.has(originalStream)) {
                    return _this.traversedObjects.get(originalStream);
                }
                var clonedStream = originalStream.clone(_this.dest);
                _this.traversedObjects.set(originalStream, clonedStream);
                var entries = originalStream.dict.entries();
                for (var idx = 0, len = entries.length; idx < len; idx++) {
                    var _a = entries[idx], key = _a[0], value = _a[1];
                    clonedStream.dict.set(key, _this.copy(value));
                }
                return clonedStream;
            };
            this.copyPDFIndirectObject = function (ref) {
                var alreadyMapped = _this.traversedObjects.has(ref);
                if (!alreadyMapped) {
                    var newRef = _this.dest.nextRef();
                    _this.traversedObjects.set(ref, newRef);
                    var dereferencedValue = _this.src.lookup(ref);
                    if (dereferencedValue) {
                        var cloned = _this.copy(dereferencedValue);
                        _this.dest.assign(newRef, cloned);
                    }
                }
                return _this.traversedObjects.get(ref);
            };
            this.src = src;
            this.dest = dest;
        }
        PDFObjectCopier.for = function (src, dest) {
            return new PDFObjectCopier(src, dest);
        };
        return PDFObjectCopier;
    }());
    //# sourceMappingURL=PDFObjectCopier.js.map

    /**
     * Entries should be added using the [[addEntry]] and [[addDeletedEntry]]
     * methods **in order of ascending object number**.
     */
    var PDFCrossRefSection = /** @class */ (function () {
        function PDFCrossRefSection(firstEntry) {
            this.subsections = firstEntry ? [[firstEntry]] : [];
            this.chunkIdx = 0;
            this.chunkLength = firstEntry ? 1 : 0;
        }
        PDFCrossRefSection.prototype.addEntry = function (ref, offset) {
            this.append({ ref: ref, offset: offset, deleted: false });
        };
        PDFCrossRefSection.prototype.addDeletedEntry = function (ref, nextFreeObjectNumber) {
            this.append({ ref: ref, offset: nextFreeObjectNumber, deleted: true });
        };
        PDFCrossRefSection.prototype.toString = function () {
            var section = "xref\n";
            for (var rangeIdx = 0, rangeLen = this.subsections.length; rangeIdx < rangeLen; rangeIdx++) {
                var range = this.subsections[rangeIdx];
                section += range[0].ref.objectNumber + " " + range.length + "\n";
                for (var entryIdx = 0, entryLen = range.length; entryIdx < entryLen; entryIdx++) {
                    var entry = range[entryIdx];
                    section += padStart(String(entry.offset), 10, '0');
                    section += ' ';
                    section += padStart(String(entry.ref.generationNumber), 5, '0');
                    section += ' ';
                    section += entry.deleted ? 'f' : 'n';
                    section += ' \n';
                }
            }
            return section;
        };
        PDFCrossRefSection.prototype.sizeInBytes = function () {
            var size = 5;
            for (var idx = 0, len = this.subsections.length; idx < len; idx++) {
                var subsection = this.subsections[idx];
                var subsectionLength = subsection.length;
                var firstEntry = subsection[0];
                size += 2;
                size += String(firstEntry.ref.objectNumber).length;
                size += String(subsectionLength).length;
                size += 20 * subsectionLength;
            }
            return size;
        };
        PDFCrossRefSection.prototype.copyBytesInto = function (buffer, offset) {
            var initialOffset = offset;
            buffer[offset++] = CharCodes$1.x;
            buffer[offset++] = CharCodes$1.r;
            buffer[offset++] = CharCodes$1.e;
            buffer[offset++] = CharCodes$1.f;
            buffer[offset++] = CharCodes$1.Newline;
            offset += this.copySubsectionsIntoBuffer(this.subsections, buffer, offset);
            return offset - initialOffset;
        };
        PDFCrossRefSection.prototype.copySubsectionsIntoBuffer = function (subsections, buffer, offset) {
            var initialOffset = offset;
            var length = subsections.length;
            for (var idx = 0; idx < length; idx++) {
                var subsection = this.subsections[idx];
                var firstObjectNumber = String(subsection[0].ref.objectNumber);
                offset += copyStringIntoBuffer(firstObjectNumber, buffer, offset);
                buffer[offset++] = CharCodes$1.Space;
                var rangeLength = String(subsection.length);
                offset += copyStringIntoBuffer(rangeLength, buffer, offset);
                buffer[offset++] = CharCodes$1.Newline;
                offset += this.copyEntriesIntoBuffer(subsection, buffer, offset);
            }
            return offset - initialOffset;
        };
        PDFCrossRefSection.prototype.copyEntriesIntoBuffer = function (entries, buffer, offset) {
            var length = entries.length;
            for (var idx = 0; idx < length; idx++) {
                var entry = entries[idx];
                var entryOffset = padStart(String(entry.offset), 10, '0');
                offset += copyStringIntoBuffer(entryOffset, buffer, offset);
                buffer[offset++] = CharCodes$1.Space;
                var entryGen = padStart(String(entry.ref.generationNumber), 5, '0');
                offset += copyStringIntoBuffer(entryGen, buffer, offset);
                buffer[offset++] = CharCodes$1.Space;
                buffer[offset++] = entry.deleted ? CharCodes$1.f : CharCodes$1.n;
                buffer[offset++] = CharCodes$1.Space;
                buffer[offset++] = CharCodes$1.Newline;
            }
            return 20 * length;
        };
        PDFCrossRefSection.prototype.append = function (currEntry) {
            if (this.chunkLength === 0) {
                this.subsections.push([currEntry]);
                this.chunkIdx = 0;
                this.chunkLength = 1;
                return;
            }
            var chunk = this.subsections[this.chunkIdx];
            var prevEntry = chunk[this.chunkLength - 1];
            if (currEntry.ref.objectNumber - prevEntry.ref.objectNumber > 1) {
                this.subsections.push([currEntry]);
                this.chunkIdx += 1;
                this.chunkLength = 1;
            }
            else {
                chunk.push(currEntry);
                this.chunkLength += 1;
            }
        };
        PDFCrossRefSection.create = function () {
            return new PDFCrossRefSection({
                ref: PDFRef.of(0, 65535),
                offset: 0,
                deleted: true,
            });
        };
        PDFCrossRefSection.createEmpty = function () { return new PDFCrossRefSection(); };
        return PDFCrossRefSection;
    }());
    //# sourceMappingURL=PDFCrossRefSection.js.map

    var PDFTrailer = /** @class */ (function () {
        function PDFTrailer(lastXRefOffset) {
            this.lastXRefOffset = String(lastXRefOffset);
        }
        PDFTrailer.prototype.toString = function () {
            return "startxref\n" + this.lastXRefOffset + "\n%%EOF";
        };
        PDFTrailer.prototype.sizeInBytes = function () {
            return 16 + this.lastXRefOffset.length;
        };
        PDFTrailer.prototype.copyBytesInto = function (buffer, offset) {
            var initialOffset = offset;
            buffer[offset++] = CharCodes$1.s;
            buffer[offset++] = CharCodes$1.t;
            buffer[offset++] = CharCodes$1.a;
            buffer[offset++] = CharCodes$1.r;
            buffer[offset++] = CharCodes$1.t;
            buffer[offset++] = CharCodes$1.x;
            buffer[offset++] = CharCodes$1.r;
            buffer[offset++] = CharCodes$1.e;
            buffer[offset++] = CharCodes$1.f;
            buffer[offset++] = CharCodes$1.Newline;
            offset += copyStringIntoBuffer(this.lastXRefOffset, buffer, offset);
            buffer[offset++] = CharCodes$1.Newline;
            buffer[offset++] = CharCodes$1.Percent;
            buffer[offset++] = CharCodes$1.Percent;
            buffer[offset++] = CharCodes$1.E;
            buffer[offset++] = CharCodes$1.O;
            buffer[offset++] = CharCodes$1.F;
            return offset - initialOffset;
        };
        PDFTrailer.forLastCrossRefSectionOffset = function (offset) {
            return new PDFTrailer(offset);
        };
        return PDFTrailer;
    }());
    //# sourceMappingURL=PDFTrailer.js.map

    var PDFTrailerDict = /** @class */ (function () {
        function PDFTrailerDict(dict) {
            this.dict = dict;
        }
        PDFTrailerDict.prototype.toString = function () {
            return "trailer\n" + this.dict.toString();
        };
        PDFTrailerDict.prototype.sizeInBytes = function () {
            return 8 + this.dict.sizeInBytes();
        };
        PDFTrailerDict.prototype.copyBytesInto = function (buffer, offset) {
            var initialOffset = offset;
            buffer[offset++] = CharCodes$1.t;
            buffer[offset++] = CharCodes$1.r;
            buffer[offset++] = CharCodes$1.a;
            buffer[offset++] = CharCodes$1.i;
            buffer[offset++] = CharCodes$1.l;
            buffer[offset++] = CharCodes$1.e;
            buffer[offset++] = CharCodes$1.r;
            buffer[offset++] = CharCodes$1.Newline;
            offset += this.dict.copyBytesInto(buffer, offset);
            return offset - initialOffset;
        };
        PDFTrailerDict.of = function (dict) { return new PDFTrailerDict(dict); };
        return PDFTrailerDict;
    }());
    //# sourceMappingURL=PDFTrailerDict.js.map

    var PDFObjectStream = /** @class */ (function (_super) {
        __extends(PDFObjectStream, _super);
        function PDFObjectStream(context, objects, encode) {
            if (encode === void 0) { encode = true; }
            var _this = _super.call(this, context.obj({}), encode) || this;
            _this.objects = objects;
            _this.offsets = _this.computeObjectOffsets();
            _this.offsetsString = _this.computeOffsetsString();
            _this.dict.set(PDFName.of('Type'), PDFName.of('ObjStm'));
            _this.dict.set(PDFName.of('N'), PDFNumber.of(_this.objects.length));
            _this.dict.set(PDFName.of('First'), PDFNumber.of(_this.offsetsString.length));
            return _this;
        }
        PDFObjectStream.prototype.getObjectsCount = function () {
            return this.objects.length;
        };
        PDFObjectStream.prototype.clone = function (context) {
            return PDFObjectStream.withContextAndObjects(context || this.dict.context, this.objects.slice(), this.encode);
        };
        PDFObjectStream.prototype.getContentsString = function () {
            var value = this.offsetsString;
            for (var idx = 0, len = this.objects.length; idx < len; idx++) {
                var _a = this.objects[idx], object = _a[1];
                value += object + "\n";
            }
            return value;
        };
        PDFObjectStream.prototype.getUnencodedContents = function () {
            var buffer = new Uint8Array(this.getUnencodedContentsSize());
            var offset = copyStringIntoBuffer(this.offsetsString, buffer, 0);
            for (var idx = 0, len = this.objects.length; idx < len; idx++) {
                var _a = this.objects[idx], object = _a[1];
                offset += object.copyBytesInto(buffer, offset);
                buffer[offset++] = CharCodes$1.Newline;
            }
            return buffer;
        };
        PDFObjectStream.prototype.getUnencodedContentsSize = function () {
            return (this.offsetsString.length +
                last(this.offsets)[1] +
                last(this.objects)[1].sizeInBytes() +
                1);
        };
        PDFObjectStream.prototype.computeOffsetsString = function () {
            var offsetsString = '';
            for (var idx = 0, len = this.offsets.length; idx < len; idx++) {
                var _a = this.offsets[idx], objectNumber = _a[0], offset = _a[1];
                offsetsString += objectNumber + " " + offset + " ";
            }
            return offsetsString;
        };
        PDFObjectStream.prototype.computeObjectOffsets = function () {
            var offset = 0;
            var offsets = new Array(this.objects.length);
            for (var idx = 0, len = this.objects.length; idx < len; idx++) {
                var _a = this.objects[idx], ref = _a[0], object = _a[1];
                offsets[idx] = [ref.objectNumber, offset];
                offset += object.sizeInBytes() + 1; // '\n'
            }
            return offsets;
        };
        PDFObjectStream.withContextAndObjects = function (context, objects, encode) {
            if (encode === void 0) { encode = true; }
            return new PDFObjectStream(context, objects, encode);
        };
        return PDFObjectStream;
    }(PDFFlateStream));
    //# sourceMappingURL=PDFObjectStream.js.map

    var PDFWriter = /** @class */ (function () {
        function PDFWriter(context, objectsPerTick) {
            var _this = this;
            this.parsedObjects = 0;
            this.shouldWaitForTick = function (n) {
                _this.parsedObjects += n;
                return _this.parsedObjects % _this.objectsPerTick === 0;
            };
            this.context = context;
            this.objectsPerTick = objectsPerTick;
        }
        PDFWriter.prototype.serializeToBuffer = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, size, header, indirectObjects, xref, trailerDict, trailer, offset, buffer, idx, len, _b, ref, object, objectNumber, generationNumber, n;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.computeBufferSize()];
                        case 1:
                            _a = _c.sent(), size = _a.size, header = _a.header, indirectObjects = _a.indirectObjects, xref = _a.xref, trailerDict = _a.trailerDict, trailer = _a.trailer;
                            offset = 0;
                            buffer = new Uint8Array(size);
                            offset += header.copyBytesInto(buffer, offset);
                            buffer[offset++] = CharCodes$1.Newline;
                            buffer[offset++] = CharCodes$1.Newline;
                            idx = 0, len = indirectObjects.length;
                            _c.label = 2;
                        case 2:
                            if (!(idx < len)) return [3 /*break*/, 5];
                            _b = indirectObjects[idx], ref = _b[0], object = _b[1];
                            objectNumber = String(ref.objectNumber);
                            offset += copyStringIntoBuffer(objectNumber, buffer, offset);
                            buffer[offset++] = CharCodes$1.Space;
                            generationNumber = String(ref.generationNumber);
                            offset += copyStringIntoBuffer(generationNumber, buffer, offset);
                            buffer[offset++] = CharCodes$1.Space;
                            buffer[offset++] = CharCodes$1.o;
                            buffer[offset++] = CharCodes$1.b;
                            buffer[offset++] = CharCodes$1.j;
                            buffer[offset++] = CharCodes$1.Newline;
                            offset += object.copyBytesInto(buffer, offset);
                            buffer[offset++] = CharCodes$1.Newline;
                            buffer[offset++] = CharCodes$1.e;
                            buffer[offset++] = CharCodes$1.n;
                            buffer[offset++] = CharCodes$1.d;
                            buffer[offset++] = CharCodes$1.o;
                            buffer[offset++] = CharCodes$1.b;
                            buffer[offset++] = CharCodes$1.j;
                            buffer[offset++] = CharCodes$1.Newline;
                            buffer[offset++] = CharCodes$1.Newline;
                            n = object instanceof PDFObjectStream ? object.getObjectsCount() : 1;
                            if (!this.shouldWaitForTick(n)) return [3 /*break*/, 4];
                            return [4 /*yield*/, waitForTick()];
                        case 3:
                            _c.sent();
                            _c.label = 4;
                        case 4:
                            idx++;
                            return [3 /*break*/, 2];
                        case 5:
                            if (xref) {
                                offset += xref.copyBytesInto(buffer, offset);
                                buffer[offset++] = CharCodes$1.Newline;
                            }
                            if (trailerDict) {
                                offset += trailerDict.copyBytesInto(buffer, offset);
                                buffer[offset++] = CharCodes$1.Newline;
                                buffer[offset++] = CharCodes$1.Newline;
                            }
                            offset += trailer.copyBytesInto(buffer, offset);
                            return [2 /*return*/, buffer];
                    }
                });
            });
        };
        PDFWriter.prototype.computeIndirectObjectSize = function (_a) {
            var ref = _a[0], object = _a[1];
            var refSize = ref.sizeInBytes() + 3; // 'R' -> 'obj\n'
            var objectSize = object.sizeInBytes() + 9; // '\nendobj\n\n'
            return refSize + objectSize;
        };
        PDFWriter.prototype.createTrailerDict = function () {
            return this.context.obj({
                Size: this.context.largestObjectNumber + 1,
                Root: this.context.trailerInfo.Root,
                Encrypt: this.context.trailerInfo.Encrypt,
                Info: this.context.trailerInfo.Info,
                ID: this.context.trailerInfo.ID,
            });
        };
        PDFWriter.prototype.computeBufferSize = function () {
            return __awaiter(this, void 0, void 0, function () {
                var header, size, xref, indirectObjects, idx, len, indirectObject, ref, xrefOffset, trailerDict, trailer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            header = PDFHeader.forVersion(1, 7);
                            size = header.sizeInBytes() + 2;
                            xref = PDFCrossRefSection.create();
                            indirectObjects = this.context.enumerateIndirectObjects();
                            idx = 0, len = indirectObjects.length;
                            _a.label = 1;
                        case 1:
                            if (!(idx < len)) return [3 /*break*/, 4];
                            indirectObject = indirectObjects[idx];
                            ref = indirectObject[0];
                            xref.addEntry(ref, size);
                            size += this.computeIndirectObjectSize(indirectObject);
                            if (!this.shouldWaitForTick(1)) return [3 /*break*/, 3];
                            return [4 /*yield*/, waitForTick()];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            idx++;
                            return [3 /*break*/, 1];
                        case 4:
                            xrefOffset = size;
                            size += xref.sizeInBytes() + 1; // '\n'
                            trailerDict = PDFTrailerDict.of(this.createTrailerDict());
                            size += trailerDict.sizeInBytes() + 2; // '\n\n'
                            trailer = PDFTrailer.forLastCrossRefSectionOffset(xrefOffset);
                            size += trailer.sizeInBytes();
                            return [2 /*return*/, { size: size, header: header, indirectObjects: indirectObjects, xref: xref, trailerDict: trailerDict, trailer: trailer }];
                    }
                });
            });
        };
        PDFWriter.forContext = function (context, objectsPerTick) {
            return new PDFWriter(context, objectsPerTick);
        };
        return PDFWriter;
    }());
    //# sourceMappingURL=PDFWriter.js.map

    var PDFInvalidObject = /** @class */ (function (_super) {
        __extends(PDFInvalidObject, _super);
        function PDFInvalidObject(data) {
            var _this = _super.call(this) || this;
            _this.data = data;
            return _this;
        }
        PDFInvalidObject.prototype.clone = function () {
            return PDFInvalidObject.of(this.data.slice());
        };
        PDFInvalidObject.prototype.toString = function () {
            return "PDFInvalidObject(" + this.data.length + " bytes)";
        };
        PDFInvalidObject.prototype.sizeInBytes = function () {
            return this.data.length;
        };
        PDFInvalidObject.prototype.copyBytesInto = function (buffer, offset) {
            var length = this.data.length;
            for (var idx = 0; idx < length; idx++) {
                buffer[offset++] = this.data[idx];
            }
            return length;
        };
        PDFInvalidObject.of = function (data) { return new PDFInvalidObject(data); };
        return PDFInvalidObject;
    }(PDFObject));
    //# sourceMappingURL=PDFInvalidObject.js.map

    var EntryType;
    (function (EntryType) {
        EntryType[EntryType["Deleted"] = 0] = "Deleted";
        EntryType[EntryType["Uncompressed"] = 1] = "Uncompressed";
        EntryType[EntryType["Compressed"] = 2] = "Compressed";
    })(EntryType || (EntryType = {}));
    /**
     * Entries should be added using the [[addDeletedEntry]],
     * [[addUncompressedEntry]], and [[addCompressedEntry]] methods
     * **in order of ascending object number**.
     */
    var PDFCrossRefStream = /** @class */ (function (_super) {
        __extends(PDFCrossRefStream, _super);
        function PDFCrossRefStream(dict, entries, encode) {
            if (encode === void 0) { encode = true; }
            var _this = _super.call(this, dict, encode) || this;
            // Returns an array of integer pairs for each subsection of the cross ref
            // section, where each integer pair represents:
            //   firstObjectNumber(OfSection), length(OfSection)
            _this.computeIndex = function () {
                var subsections = [];
                var subsectionLength = 0;
                for (var idx = 0, len = _this.entries.length; idx < len; idx++) {
                    var currEntry = _this.entries[idx];
                    var prevEntry = _this.entries[idx - 1];
                    if (idx === 0) {
                        subsections.push(currEntry.ref.objectNumber);
                    }
                    else if (currEntry.ref.objectNumber - prevEntry.ref.objectNumber > 1) {
                        subsections.push(subsectionLength);
                        subsections.push(currEntry.ref.objectNumber);
                        subsectionLength = 0;
                    }
                    subsectionLength += 1;
                }
                subsections.push(subsectionLength);
                return subsections;
            };
            _this.computeEntryTuples = function () {
                var entryTuples = new Array(_this.entries.length);
                for (var idx = 0, len = _this.entries.length; idx < len; idx++) {
                    var entry = _this.entries[idx];
                    if (entry.type === EntryType.Deleted) {
                        var type = entry.type, nextFreeObjectNumber = entry.nextFreeObjectNumber, ref = entry.ref;
                        entryTuples[idx] = [type, nextFreeObjectNumber, ref.generationNumber];
                    }
                    if (entry.type === EntryType.Uncompressed) {
                        var type = entry.type, offset = entry.offset, ref = entry.ref;
                        entryTuples[idx] = [type, offset, ref.generationNumber];
                    }
                    if (entry.type === EntryType.Compressed) {
                        var type = entry.type, objectStreamRef = entry.objectStreamRef, index = entry.index;
                        entryTuples[idx] = [type, objectStreamRef.objectNumber, index];
                    }
                }
                return entryTuples;
            };
            _this.computeMaxEntryByteWidths = function () {
                var entryTuples = _this.entryTuplesCache.access();
                var widths = [0, 0, 0];
                for (var idx = 0, len = entryTuples.length; idx < len; idx++) {
                    var _a = entryTuples[idx], first = _a[0], second = _a[1], third = _a[2];
                    var firstSize = sizeInBytes(first);
                    var secondSize = sizeInBytes(second);
                    var thirdSize = sizeInBytes(third);
                    if (firstSize > widths[0])
                        widths[0] = firstSize;
                    if (secondSize > widths[1])
                        widths[1] = secondSize;
                    if (thirdSize > widths[2])
                        widths[2] = thirdSize;
                }
                return widths;
            };
            _this.entries = entries || [];
            _this.entryTuplesCache = Cache.populatedBy(_this.computeEntryTuples);
            _this.maxByteWidthsCache = Cache.populatedBy(_this.computeMaxEntryByteWidths);
            _this.indexCache = Cache.populatedBy(_this.computeIndex);
            dict.set(PDFName.of('Type'), PDFName.of('XRef'));
            return _this;
        }
        PDFCrossRefStream.prototype.addDeletedEntry = function (ref, nextFreeObjectNumber) {
            var type = EntryType.Deleted;
            this.entries.push({ type: type, ref: ref, nextFreeObjectNumber: nextFreeObjectNumber });
            this.entryTuplesCache.invalidate();
            this.maxByteWidthsCache.invalidate();
            this.indexCache.invalidate();
            this.contentsCache.invalidate();
        };
        PDFCrossRefStream.prototype.addUncompressedEntry = function (ref, offset) {
            var type = EntryType.Uncompressed;
            this.entries.push({ type: type, ref: ref, offset: offset });
            this.entryTuplesCache.invalidate();
            this.maxByteWidthsCache.invalidate();
            this.indexCache.invalidate();
            this.contentsCache.invalidate();
        };
        PDFCrossRefStream.prototype.addCompressedEntry = function (ref, objectStreamRef, index) {
            var type = EntryType.Compressed;
            this.entries.push({ type: type, ref: ref, objectStreamRef: objectStreamRef, index: index });
            this.entryTuplesCache.invalidate();
            this.maxByteWidthsCache.invalidate();
            this.indexCache.invalidate();
            this.contentsCache.invalidate();
        };
        PDFCrossRefStream.prototype.clone = function (context) {
            var _a = this, dict = _a.dict, entries = _a.entries, encode = _a.encode;
            return PDFCrossRefStream.of(dict.clone(context), entries.slice(), encode);
        };
        PDFCrossRefStream.prototype.getContentsString = function () {
            var entryTuples = this.entryTuplesCache.access();
            var byteWidths = this.maxByteWidthsCache.access();
            var value = '';
            for (var entryIdx = 0, entriesLen = entryTuples.length; entryIdx < entriesLen; entryIdx++) {
                var _a = entryTuples[entryIdx], first = _a[0], second = _a[1], third = _a[2];
                var firstBytes = reverseArray(bytesFor(first));
                var secondBytes = reverseArray(bytesFor(second));
                var thirdBytes = reverseArray(bytesFor(third));
                for (var idx = byteWidths[0] - 1; idx >= 0; idx--) {
                    value += (firstBytes[idx] || 0).toString(2);
                }
                for (var idx = byteWidths[1] - 1; idx >= 0; idx--) {
                    value += (secondBytes[idx] || 0).toString(2);
                }
                for (var idx = byteWidths[2] - 1; idx >= 0; idx--) {
                    value += (thirdBytes[idx] || 0).toString(2);
                }
            }
            return value;
        };
        PDFCrossRefStream.prototype.getUnencodedContents = function () {
            var entryTuples = this.entryTuplesCache.access();
            var byteWidths = this.maxByteWidthsCache.access();
            var buffer = new Uint8Array(this.getUnencodedContentsSize());
            var offset = 0;
            for (var entryIdx = 0, entriesLen = entryTuples.length; entryIdx < entriesLen; entryIdx++) {
                var _a = entryTuples[entryIdx], first = _a[0], second = _a[1], third = _a[2];
                var firstBytes = reverseArray(bytesFor(first));
                var secondBytes = reverseArray(bytesFor(second));
                var thirdBytes = reverseArray(bytesFor(third));
                for (var idx = byteWidths[0] - 1; idx >= 0; idx--) {
                    buffer[offset++] = firstBytes[idx] || 0;
                }
                for (var idx = byteWidths[1] - 1; idx >= 0; idx--) {
                    buffer[offset++] = secondBytes[idx] || 0;
                }
                for (var idx = byteWidths[2] - 1; idx >= 0; idx--) {
                    buffer[offset++] = thirdBytes[idx] || 0;
                }
            }
            return buffer;
        };
        PDFCrossRefStream.prototype.getUnencodedContentsSize = function () {
            var byteWidths = this.maxByteWidthsCache.access();
            var entryWidth = sum(byteWidths);
            return entryWidth * this.entries.length;
        };
        PDFCrossRefStream.prototype.updateDict = function () {
            _super.prototype.updateDict.call(this);
            var byteWidths = this.maxByteWidthsCache.access();
            var index = this.indexCache.access();
            var context = this.dict.context;
            this.dict.set(PDFName.of('W'), context.obj(byteWidths));
            this.dict.set(PDFName.of('Index'), context.obj(index));
        };
        PDFCrossRefStream.create = function (dict, encode) {
            if (encode === void 0) { encode = true; }
            var stream = new PDFCrossRefStream(dict, [], encode);
            stream.addDeletedEntry(PDFRef.of(0, 65535), 0);
            return stream;
        };
        PDFCrossRefStream.of = function (dict, entries, encode) {
            if (encode === void 0) { encode = true; }
            return new PDFCrossRefStream(dict, entries, encode);
        };
        return PDFCrossRefStream;
    }(PDFFlateStream));
    //# sourceMappingURL=PDFCrossRefStream.js.map

    var PDFStreamWriter = /** @class */ (function (_super) {
        __extends(PDFStreamWriter, _super);
        function PDFStreamWriter(context, objectsPerTick, encodeStreams, objectsPerStream) {
            var _this = _super.call(this, context, objectsPerTick) || this;
            _this.encodeStreams = encodeStreams;
            _this.objectsPerStream = objectsPerStream;
            return _this;
        }
        PDFStreamWriter.prototype.computeBufferSize = function () {
            return __awaiter(this, void 0, void 0, function () {
                var objectNumber, header, size, xrefStream, uncompressedObjects, compressedObjects, objectStreamRefs, indirectObjects, idx, len, indirectObject, ref, object, shouldNotCompress, chunk, objectStreamRef, idx, len, chunk, ref, objectStream, xrefStreamRef, xrefOffset, trailer;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            objectNumber = this.context.largestObjectNumber + 1;
                            header = PDFHeader.forVersion(1, 7);
                            size = header.sizeInBytes() + 2;
                            xrefStream = PDFCrossRefStream.create(this.createTrailerDict(), this.encodeStreams);
                            uncompressedObjects = [];
                            compressedObjects = [];
                            objectStreamRefs = [];
                            indirectObjects = this.context.enumerateIndirectObjects();
                            idx = 0, len = indirectObjects.length;
                            _a.label = 1;
                        case 1:
                            if (!(idx < len)) return [3 /*break*/, 6];
                            indirectObject = indirectObjects[idx];
                            ref = indirectObject[0], object = indirectObject[1];
                            shouldNotCompress = ref === this.context.trailerInfo.Encrypt ||
                                object instanceof PDFStream ||
                                object instanceof PDFInvalidObject ||
                                ref.generationNumber !== 0;
                            if (!shouldNotCompress) return [3 /*break*/, 4];
                            uncompressedObjects.push(indirectObject);
                            xrefStream.addUncompressedEntry(ref, size);
                            size += this.computeIndirectObjectSize(indirectObject);
                            if (!this.shouldWaitForTick(1)) return [3 /*break*/, 3];
                            return [4 /*yield*/, waitForTick()];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [3 /*break*/, 5];
                        case 4:
                            chunk = last(compressedObjects);
                            objectStreamRef = last(objectStreamRefs);
                            if (!chunk || chunk.length % this.objectsPerStream === 0) {
                                chunk = [];
                                compressedObjects.push(chunk);
                                objectStreamRef = PDFRef.of(objectNumber++);
                                objectStreamRefs.push(objectStreamRef);
                            }
                            xrefStream.addCompressedEntry(ref, objectStreamRef, chunk.length);
                            chunk.push(indirectObject);
                            _a.label = 5;
                        case 5:
                            idx++;
                            return [3 /*break*/, 1];
                        case 6:
                            idx = 0, len = compressedObjects.length;
                            _a.label = 7;
                        case 7:
                            if (!(idx < len)) return [3 /*break*/, 10];
                            chunk = compressedObjects[idx];
                            ref = objectStreamRefs[idx];
                            objectStream = PDFObjectStream.withContextAndObjects(this.context, chunk, this.encodeStreams);
                            xrefStream.addUncompressedEntry(ref, size);
                            size += this.computeIndirectObjectSize([ref, objectStream]);
                            uncompressedObjects.push([ref, objectStream]);
                            if (!this.shouldWaitForTick(chunk.length)) return [3 /*break*/, 9];
                            return [4 /*yield*/, waitForTick()];
                        case 8:
                            _a.sent();
                            _a.label = 9;
                        case 9:
                            idx++;
                            return [3 /*break*/, 7];
                        case 10:
                            xrefStreamRef = PDFRef.of(objectNumber++);
                            xrefStream.dict.set(PDFName.of('Size'), PDFNumber.of(objectNumber));
                            xrefStream.addUncompressedEntry(xrefStreamRef, size);
                            xrefOffset = size;
                            size += this.computeIndirectObjectSize([xrefStreamRef, xrefStream]);
                            uncompressedObjects.push([xrefStreamRef, xrefStream]);
                            trailer = PDFTrailer.forLastCrossRefSectionOffset(xrefOffset);
                            size += trailer.sizeInBytes();
                            return [2 /*return*/, { size: size, header: header, indirectObjects: uncompressedObjects, trailer: trailer }];
                    }
                });
            });
        };
        PDFStreamWriter.forContext = function (context, objectsPerTick, encodeStreams, objectsPerStream) {
            if (encodeStreams === void 0) { encodeStreams = true; }
            if (objectsPerStream === void 0) { objectsPerStream = 50; }
            return new PDFStreamWriter(context, objectsPerTick, encodeStreams, objectsPerStream);
        };
        return PDFStreamWriter;
    }(PDFWriter));
    //# sourceMappingURL=PDFStreamWriter.js.map

    var PDFHexString = /** @class */ (function (_super) {
        __extends(PDFHexString, _super);
        function PDFHexString(value) {
            var _this = _super.call(this) || this;
            _this.value = value;
            return _this;
        }
        PDFHexString.prototype.clone = function () {
            return PDFHexString.of(this.value);
        };
        PDFHexString.prototype.toString = function () {
            return "<" + this.value + ">";
        };
        PDFHexString.prototype.sizeInBytes = function () {
            return this.value.length + 2;
        };
        PDFHexString.prototype.copyBytesInto = function (buffer, offset) {
            buffer[offset++] = CharCodes$1.LessThan;
            offset += copyStringIntoBuffer(this.value, buffer, offset);
            buffer[offset++] = CharCodes$1.GreaterThan;
            return this.value.length + 2;
        };
        PDFHexString.of = function (value) { return new PDFHexString(value); };
        PDFHexString.fromText = function (value) {
            var encoded = utf16Encode(value);
            var hex = '';
            for (var idx = 0, len = encoded.length; idx < len; idx++) {
                hex += toHexStringOfMinLength(encoded[idx], 4);
            }
            return new PDFHexString(hex);
        };
        return PDFHexString;
    }(PDFObject));
    //# sourceMappingURL=PDFHexString.js.map

    /**
     * A note of thanks to the developers of https://github.com/foliojs/pdfkit, as
     * this class borrows from:
     *   https://github.com/foliojs/pdfkit/blob/f91bdd61c164a72ea06be1a43dc0a412afc3925f/lib/font/afm.coffee
     */
    var StandardFontEmbedder = /** @class */ (function () {
        function StandardFontEmbedder(fontName) {
            // prettier-ignore
            this.encoding = (fontName === FontNames.ZapfDingbats ? Encodings.ZapfDingbats
                : fontName === FontNames.Symbol ? Encodings.Symbol
                    : Encodings.WinAnsi);
            this.font = Font.load(fontName);
            this.fontName = this.font.FontName;
        }
        /**
         * Encode the JavaScript string into this font. (JavaScript encodes strings in
         * Unicode, but standard fonts use either WinAnsi, ZapfDingbats, or Symbol
         * encodings)
         */
        StandardFontEmbedder.prototype.encodeText = function (text) {
            var glyphs = this.encodeTextAsGlyphs(text);
            var hexCodes = new Array(glyphs.length);
            for (var idx = 0, len = glyphs.length; idx < len; idx++) {
                hexCodes[idx] = toHexString(glyphs[idx].code);
            }
            return PDFHexString.of(hexCodes.join(''));
        };
        StandardFontEmbedder.prototype.widthOfTextAtSize = function (text, size) {
            var glyphs = this.encodeTextAsGlyphs(text);
            var totalWidth = 0;
            for (var idx = 0, len = glyphs.length; idx < len; idx++) {
                var left = glyphs[idx].name;
                var right = (glyphs[idx + 1] || {}).name;
                var kernAmount = this.font.getXAxisKerningForPair(left, right) || 0;
                totalWidth += this.widthOfGlyph(left) + kernAmount;
            }
            var scale = size / 1000;
            return totalWidth * scale;
        };
        StandardFontEmbedder.prototype.heightOfFontAtSize = function (size) {
            var _a = this.font, Ascender = _a.Ascender, Descender = _a.Descender, FontBBox = _a.FontBBox;
            var yTop = Ascender || FontBBox[3];
            var yBottom = Descender || FontBBox[1];
            return ((yTop - yBottom) / 1000) * size;
        };
        StandardFontEmbedder.prototype.sizeOfFontAtHeight = function (height) {
            var _a = this.font, Ascender = _a.Ascender, Descender = _a.Descender, FontBBox = _a.FontBBox;
            var yTop = Ascender || FontBBox[3];
            var yBottom = Descender || FontBBox[1];
            return (1000 * height) / (yTop - yBottom);
        };
        StandardFontEmbedder.prototype.embedIntoContext = function (context, ref) {
            var fontDict = context.obj({
                Type: 'Font',
                Subtype: 'Type1',
                BaseFont: this.font.FontName,
                Encoding: this.encoding === Encodings.WinAnsi ? 'WinAnsiEncoding' : undefined,
            });
            if (ref) {
                context.assign(ref, fontDict);
                return ref;
            }
            else {
                return context.register(fontDict);
            }
        };
        StandardFontEmbedder.prototype.widthOfGlyph = function (glyphName) {
            // Default to 250 if font doesn't specify a width
            return this.font.getWidthOfGlyph(glyphName) || 250;
        };
        StandardFontEmbedder.prototype.encodeTextAsGlyphs = function (text) {
            var codePoints = Array.from(text);
            var glyphs = new Array(codePoints.length);
            for (var idx = 0, len = codePoints.length; idx < len; idx++) {
                var codePoint = toCodePoint(codePoints[idx]);
                glyphs[idx] = this.encoding.encodeUnicodeCodePoint(codePoint);
            }
            return glyphs;
        };
        StandardFontEmbedder.for = function (fontName) { return new StandardFontEmbedder(fontName); };
        return StandardFontEmbedder;
    }());
    //# sourceMappingURL=StandardFontEmbedder.js.map

    /** `glyphs` should be an array of unique glyphs */
    var createCmap = function (glyphs, glyphId) {
        var bfChars = new Array(glyphs.length);
        for (var idx = 0, len = glyphs.length; idx < len; idx++) {
            var glyph = glyphs[idx];
            var id = cmapHexFormat(cmapHexString(glyphId(glyph)));
            var unicode = cmapHexFormat.apply(void 0, glyph.codePoints.map(cmapCodePointFormat));
            bfChars[idx] = [id, unicode];
        }
        return fillCmapTemplate(bfChars);
    };
    /* =============================== Templates ================================ */
    var fillCmapTemplate = function (bfChars) { return "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo <<\n  /Registry (Adobe)\n  /Ordering (UCS)\n  /Supplement 0\n>> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000><ffff>\nendcodespacerange\n" + bfChars.length + " beginbfchar\n" + bfChars.map(function (_a) {
        var glyphId = _a[0], codePoint = _a[1];
        return glyphId + " " + codePoint;
    }).join('\n') + "\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend"; };
    /* =============================== Utilities ================================ */
    var cmapHexFormat = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        return "<" + values.join('') + ">";
    };
    var cmapHexString = function (value) { return toHexStringOfMinLength(value, 4); };
    var cmapCodePointFormat = function (codePoint) {
        if (isWithinBMP(codePoint))
            return cmapHexString(codePoint);
        if (hasSurrogates(codePoint)) {
            var hs = highSurrogate(codePoint);
            var ls = lowSurrogate(codePoint);
            return "" + cmapHexString(hs) + cmapHexString(ls);
        }
        var hex = toHexString(codePoint);
        var msg = "0x" + hex + " is not a valid UTF-8 or UTF-16 codepoint.";
        throw new Error(msg);
    };
    //# sourceMappingURL=CMap.js.map

    // prettier-ignore
    var makeFontFlags = function (options) {
        var flags = 0;
        var flipBit = function (bit) { flags |= (1 << (bit - 1)); };
        if (options.fixedPitch)
            flipBit(1);
        if (options.serif)
            flipBit(2);
        if (options.symbolic)
            flipBit(3);
        if (options.script)
            flipBit(4);
        if (options.nonsymbolic)
            flipBit(6);
        if (options.italic)
            flipBit(7);
        if (options.allCap)
            flipBit(17);
        if (options.smallCap)
            flipBit(18);
        if (options.forceBold)
            flipBit(19);
        return flags;
    };
    // From: https://github.com/foliojs/pdfkit/blob/83f5f7243172a017adcf6a7faa5547c55982c57b/lib/font/embedded.js#L123-L129
    var deriveFontFlags = function (font) {
        var familyClass = font['OS/2'] ? font['OS/2'].sFamilyClass : 0;
        var flags = makeFontFlags({
            fixedPitch: font.post.isFixedPitch,
            serif: 1 <= familyClass && familyClass <= 7,
            symbolic: true,
            script: familyClass === 10,
            italic: font.head.macStyle.italic,
        });
        return flags;
    };
    //# sourceMappingURL=FontFlags.js.map

    var PDFString = /** @class */ (function (_super) {
        __extends(PDFString, _super);
        function PDFString(value) {
            var _this = _super.call(this) || this;
            _this.value = value;
            return _this;
        }
        PDFString.prototype.clone = function () {
            return PDFString.of(this.value);
        };
        PDFString.prototype.toString = function () {
            return "(" + this.value + ")";
        };
        PDFString.prototype.sizeInBytes = function () {
            return this.value.length + 2;
        };
        PDFString.prototype.copyBytesInto = function (buffer, offset) {
            buffer[offset++] = CharCodes$1.LeftParen;
            offset += copyStringIntoBuffer(this.value, buffer, offset);
            buffer[offset++] = CharCodes$1.RightParen;
            return this.value.length + 2;
        };
        // The PDF spec allows newlines and parens to appear directly within a literal
        // string. These character _may_ be escaped. But they do not _have_ to be. So
        // for simplicity, we will not bother escaping them.
        PDFString.of = function (value) { return new PDFString(value); };
        PDFString.fromDate = function (date) {
            var year = padStart(String(date.getUTCFullYear()), 4, '0');
            var month = padStart(String(date.getUTCMonth() + 1), 2, '0');
            var day = padStart(String(date.getUTCDate()), 2, '0');
            var hours = padStart(String(date.getUTCHours()), 2, '0');
            var mins = padStart(String(date.getUTCMinutes()), 2, '0');
            var secs = padStart(String(date.getUTCSeconds()), 2, '0');
            return new PDFString("D:" + year + month + day + hours + mins + secs + "Z");
        };
        return PDFString;
    }(PDFObject));
    //# sourceMappingURL=PDFString.js.map

    /**
     * A note of thanks to the developers of https://github.com/foliojs/pdfkit, as
     * this class borrows from:
     *   https://github.com/devongovett/pdfkit/blob/e71edab0dd4657b5a767804ba86c94c58d01fbca/lib/image/jpeg.coffee
     */
    var CustomFontEmbedder = /** @class */ (function () {
        function CustomFontEmbedder(font, fontData) {
            var _this = this;
            this.allGlyphsInFontSortedById = function () {
                var glyphs = new Array(_this.font.characterSet.length);
                for (var idx = 0, len = glyphs.length; idx < len; idx++) {
                    var codePoint = _this.font.characterSet[idx];
                    glyphs[idx] = _this.font.glyphForCodePoint(codePoint);
                }
                return sortedUniq(glyphs.sort(byAscendingId), function (g) { return g.id; });
            };
            this.font = font;
            this.scale = 1000 / this.font.unitsPerEm;
            this.fontData = fontData;
            this.fontName = this.font.postscriptName || 'Font';
            this.baseFontName = '';
            this.glyphCache = Cache.populatedBy(this.allGlyphsInFontSortedById);
        }
        CustomFontEmbedder.for = function (fontkit, fontData) {
            return __awaiter(this, void 0, void 0, function () {
                var font;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fontkit.create(fontData)];
                        case 1:
                            font = _a.sent();
                            return [2 /*return*/, new CustomFontEmbedder(font, fontData)];
                    }
                });
            });
        };
        /**
         * Encode the JavaScript string into this font. (JavaScript encodes strings in
         * Unicode, but embedded fonts use their own custom encodings)
         */
        CustomFontEmbedder.prototype.encodeText = function (text) {
            var glyphs = this.font.layout(text).glyphs;
            var hexCodes = new Array(glyphs.length);
            for (var idx = 0, len = glyphs.length; idx < len; idx++) {
                hexCodes[idx] = toHexStringOfMinLength(glyphs[idx].id, 4);
            }
            return PDFHexString.of(hexCodes.join(''));
        };
        // The advanceWidth takes into account kerning automatically, so we don't
        // have to do that manually like we do for the standard fonts.
        CustomFontEmbedder.prototype.widthOfTextAtSize = function (text, size) {
            var glyphs = this.font.layout(text).glyphs;
            var totalWidth = 0;
            for (var idx = 0, len = glyphs.length; idx < len; idx++) {
                totalWidth += glyphs[idx].advanceWidth * this.scale;
            }
            var scale = size / 1000;
            return totalWidth * scale;
        };
        CustomFontEmbedder.prototype.heightOfFontAtSize = function (size) {
            var _a = this.font, ascent = _a.ascent, descent = _a.descent, bbox = _a.bbox;
            var yTop = (ascent || bbox.maxY) * this.scale;
            var yBottom = (descent || bbox.minY) * this.scale;
            return ((yTop - yBottom) / 1000) * size;
        };
        CustomFontEmbedder.prototype.sizeOfFontAtHeight = function (height) {
            var _a = this.font, ascent = _a.ascent, descent = _a.descent, bbox = _a.bbox;
            var yTop = (ascent || bbox.maxY) * this.scale;
            var yBottom = (descent || bbox.minY) * this.scale;
            return (1000 * height) / (yTop - yBottom);
        };
        CustomFontEmbedder.prototype.embedIntoContext = function (context, ref) {
            this.baseFontName = addRandomSuffix(this.fontName);
            return this.embedFontDict(context, ref);
        };
        CustomFontEmbedder.prototype.embedFontDict = function (context, ref) {
            return __awaiter(this, void 0, void 0, function () {
                var cidFontDictRef, unicodeCMapRef, fontDict;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.embedCIDFontDict(context)];
                        case 1:
                            cidFontDictRef = _a.sent();
                            unicodeCMapRef = this.embedUnicodeCmap(context);
                            fontDict = context.obj({
                                Type: 'Font',
                                Subtype: 'Type0',
                                BaseFont: this.baseFontName,
                                Encoding: 'Identity-H',
                                DescendantFonts: [cidFontDictRef],
                                ToUnicode: unicodeCMapRef,
                            });
                            if (ref) {
                                context.assign(ref, fontDict);
                                return [2 /*return*/, ref];
                            }
                            else {
                                return [2 /*return*/, context.register(fontDict)];
                            }
                    }
                });
            });
        };
        CustomFontEmbedder.prototype.isCFF = function () {
            return this.font.cff;
        };
        CustomFontEmbedder.prototype.embedCIDFontDict = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var fontDescriptorRef, cidFontDict;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.embedFontDescriptor(context)];
                        case 1:
                            fontDescriptorRef = _a.sent();
                            cidFontDict = context.obj({
                                Type: 'Font',
                                Subtype: this.isCFF() ? 'CIDFontType0' : 'CIDFontType2',
                                BaseFont: this.baseFontName,
                                CIDSystemInfo: {
                                    Registry: PDFString.of('Adobe'),
                                    Ordering: PDFString.of('Identity'),
                                    Supplement: 0,
                                },
                                FontDescriptor: fontDescriptorRef,
                                W: this.computeWidths(),
                            });
                            return [2 /*return*/, context.register(cidFontDict)];
                    }
                });
            });
        };
        CustomFontEmbedder.prototype.embedFontDescriptor = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var fontStreamRef, scale, _a, italicAngle, ascent, descent, capHeight, xHeight, _b, minX, minY, maxX, maxY, fontDescriptor;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.embedFontStream(context)];
                        case 1:
                            fontStreamRef = _d.sent();
                            scale = this.scale;
                            _a = this.font, italicAngle = _a.italicAngle, ascent = _a.ascent, descent = _a.descent, capHeight = _a.capHeight, xHeight = _a.xHeight;
                            _b = this.font.bbox, minX = _b.minX, minY = _b.minY, maxX = _b.maxX, maxY = _b.maxY;
                            fontDescriptor = context.obj((_c = {
                                    Type: 'FontDescriptor',
                                    FontName: this.baseFontName,
                                    Flags: deriveFontFlags(this.font),
                                    FontBBox: [minX * scale, minY * scale, maxX * scale, maxY * scale],
                                    ItalicAngle: italicAngle,
                                    Ascent: ascent * scale,
                                    Descent: descent * scale,
                                    CapHeight: (capHeight || ascent) * scale,
                                    XHeight: (xHeight || 0) * scale,
                                    // Not sure how to compute/find this, nor is anybody else really:
                                    // https://stackoverflow.com/questions/35485179/stemv-value-of-the-truetype-font
                                    StemV: 0
                                },
                                _c[this.isCFF() ? 'FontFile3' : 'FontFile2'] = fontStreamRef,
                                _c));
                            return [2 /*return*/, context.register(fontDescriptor)];
                    }
                });
            });
        };
        CustomFontEmbedder.prototype.serializeFont = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.fontData];
                });
            });
        };
        CustomFontEmbedder.prototype.embedFontStream = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var fontStream, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _b = (_a = context).flateStream;
                            return [4 /*yield*/, this.serializeFont()];
                        case 1:
                            fontStream = _b.apply(_a, [_c.sent(), {
                                    Subtype: this.isCFF() ? 'CIDFontType0C' : undefined,
                                }]);
                            return [2 /*return*/, context.register(fontStream)];
                    }
                });
            });
        };
        CustomFontEmbedder.prototype.embedUnicodeCmap = function (context) {
            var cmap = createCmap(this.glyphCache.access(), this.glyphId.bind(this));
            var cmapStream = context.flateStream(cmap);
            return context.register(cmapStream);
        };
        CustomFontEmbedder.prototype.glyphId = function (glyph) {
            return glyph ? glyph.id : -1;
        };
        CustomFontEmbedder.prototype.computeWidths = function () {
            var glyphs = this.glyphCache.access();
            var widths = [];
            var currSection = [];
            for (var idx = 0, len = glyphs.length; idx < len; idx++) {
                var currGlyph = glyphs[idx];
                var prevGlyph = glyphs[idx - 1];
                var currGlyphId = this.glyphId(currGlyph);
                var prevGlyphId = this.glyphId(prevGlyph);
                if (idx === 0) {
                    widths.push(currGlyphId);
                }
                else if (currGlyphId - prevGlyphId !== 1) {
                    widths.push(currSection);
                    widths.push(currGlyphId);
                    currSection = [];
                }
                currSection.push(currGlyph.advanceWidth * this.scale);
            }
            widths.push(currSection);
            return widths;
        };
        return CustomFontEmbedder;
    }());
    //# sourceMappingURL=CustomFontEmbedder.js.map

    /**
     * A note of thanks to the developers of https://github.com/foliojs/pdfkit, as
     * this class borrows from:
     *   https://github.com/devongovett/pdfkit/blob/e71edab0dd4657b5a767804ba86c94c58d01fbca/lib/image/jpeg.coffee
     */
    var CustomFontSubsetEmbedder = /** @class */ (function (_super) {
        __extends(CustomFontSubsetEmbedder, _super);
        function CustomFontSubsetEmbedder(font, fontData) {
            var _this = _super.call(this, font, fontData) || this;
            _this.subset = _this.font.createSubset();
            _this.glyphs = [];
            _this.glyphCache = Cache.populatedBy(function () { return _this.glyphs; });
            _this.glyphIdMap = new Map();
            return _this;
        }
        CustomFontSubsetEmbedder.for = function (fontkit, fontData) {
            return __awaiter(this, void 0, void 0, function () {
                var font;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fontkit.create(fontData)];
                        case 1:
                            font = _a.sent();
                            return [2 /*return*/, new CustomFontSubsetEmbedder(font, fontData)];
                    }
                });
            });
        };
        CustomFontSubsetEmbedder.prototype.encodeText = function (text) {
            var glyphs = this.font.layout(text).glyphs;
            var hexCodes = new Array(glyphs.length);
            for (var idx = 0, len = glyphs.length; idx < len; idx++) {
                var glyph = glyphs[idx];
                var subsetGlyphId = this.subset.includeGlyph(glyph);
                this.glyphs[subsetGlyphId - 1] = glyph;
                this.glyphIdMap.set(glyph.id, subsetGlyphId);
                hexCodes[idx] = toHexStringOfMinLength(subsetGlyphId, 4);
            }
            this.glyphCache.invalidate();
            return PDFHexString.of(hexCodes.join(''));
        };
        CustomFontSubsetEmbedder.prototype.isCFF = function () {
            return this.subset.cff;
        };
        CustomFontSubsetEmbedder.prototype.glyphId = function (glyph) {
            return glyph ? this.glyphIdMap.get(glyph.id) : -1;
        };
        CustomFontSubsetEmbedder.prototype.serializeFont = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var parts = [];
                _this.subset
                    .encodeStream()
                    .on('data', function (bytes) { return parts.push(bytes); })
                    .on('end', function () { return resolve(mergeUint8Arrays(parts)); })
                    .on('error', function (err) { return reject(err); });
            });
        };
        return CustomFontSubsetEmbedder;
    }(CustomFontEmbedder));
    //# sourceMappingURL=CustomFontSubsetEmbedder.js.map

    // prettier-ignore
    var MARKERS = [
        0xffc0, 0xffc1, 0xffc2,
        0xffc3, 0xffc5, 0xffc6,
        0xffc7, 0xffc8, 0xffc9,
        0xffca, 0xffcb, 0xffcc,
        0xffcd, 0xffce, 0xffcf,
    ];
    var ColorSpace;
    (function (ColorSpace) {
        ColorSpace["DeviceGray"] = "DeviceGray";
        ColorSpace["DeviceRGB"] = "DeviceRGB";
        ColorSpace["DeviceCYMK"] = "DeviceCYMK";
    })(ColorSpace || (ColorSpace = {}));
    var ChannelToColorSpace = {
        1: ColorSpace.DeviceGray,
        3: ColorSpace.DeviceRGB,
        4: ColorSpace.DeviceCYMK,
    };
    /**
     * A note of thanks to the developers of https://github.com/foliojs/pdfkit, as
     * this class borrows from:
     *   https://github.com/devongovett/pdfkit/blob/e71edab0dd4657b5a767804ba86c94c58d01fbca/lib/image/jpeg.coffee
     */
    var JpegEmbedder = /** @class */ (function () {
        function JpegEmbedder(imageData, bitsPerComponent, width, height, colorSpace) {
            this.imageData = imageData;
            this.bitsPerComponent = bitsPerComponent;
            this.width = width;
            this.height = height;
            this.colorSpace = colorSpace;
        }
        JpegEmbedder.for = function (imageData) {
            return __awaiter(this, void 0, void 0, function () {
                var dataView, soi, pos, marker, bitsPerComponent, height, width, channelByte, channelName, colorSpace;
                return __generator(this, function (_a) {
                    dataView = new DataView(imageData.buffer);
                    soi = dataView.getUint16(0);
                    if (soi !== 0xffd8)
                        throw new Error('SOI not found in JPEG');
                    pos = 2;
                    while (pos < dataView.byteLength) {
                        marker = dataView.getUint16(pos);
                        pos += 2;
                        if (MARKERS.includes(marker))
                            break;
                        pos += dataView.getUint16(pos);
                    }
                    if (!MARKERS.includes(marker))
                        throw new Error('Invalid JPEG');
                    pos += 2;
                    bitsPerComponent = dataView.getUint8(pos++);
                    height = dataView.getUint16(pos);
                    pos += 2;
                    width = dataView.getUint16(pos);
                    pos += 2;
                    channelByte = dataView.getUint8(pos++);
                    channelName = ChannelToColorSpace[channelByte];
                    if (!channelName)
                        throw new Error('Unknown JPEG channel.');
                    colorSpace = channelName;
                    return [2 /*return*/, new JpegEmbedder(imageData, bitsPerComponent, width, height, colorSpace)];
                });
            });
        };
        JpegEmbedder.prototype.embedIntoContext = function (context, ref) {
            return __awaiter(this, void 0, void 0, function () {
                var xObject;
                return __generator(this, function (_a) {
                    xObject = context.stream(this.imageData, {
                        Type: 'XObject',
                        Subtype: 'Image',
                        BitsPerComponent: this.bitsPerComponent,
                        Width: this.width,
                        Height: this.height,
                        ColorSpace: this.colorSpace,
                        Filter: 'DCTDecode',
                    });
                    if (ref) {
                        context.assign(ref, xObject);
                        return [2 /*return*/, ref];
                    }
                    else {
                        return [2 /*return*/, context.register(xObject)];
                    }
                });
            });
        };
        return JpegEmbedder;
    }());
    //# sourceMappingURL=JpegEmbedder.js.map

    var UPNG = {};

    	

    UPNG.toRGBA8 = function(out)
    {
    	var w = out.width, h = out.height;
    	if(out.tabs.acTL==null) return [UPNG.toRGBA8.decodeImage(out.data, w, h, out).buffer];
    	
    	var frms = [];
    	if(out.frames[0].data==null) out.frames[0].data = out.data;
    	
    	var len = w*h*4, img = new Uint8Array(len), empty = new Uint8Array(len), prev=new Uint8Array(len);
    	for(var i=0; i<out.frames.length; i++)
    	{
    		var frm = out.frames[i];
    		var fx=frm.rect.x, fy=frm.rect.y, fw = frm.rect.width, fh = frm.rect.height;
    		var fdata = UPNG.toRGBA8.decodeImage(frm.data, fw,fh, out);
    		
    		if(i!=0) for(var j=0; j<len; j++) prev[j]=img[j];
    		
    		if     (frm.blend==0) UPNG._copyTile(fdata, fw, fh, img, w, h, fx, fy, 0);
    		else if(frm.blend==1) UPNG._copyTile(fdata, fw, fh, img, w, h, fx, fy, 1);
    		
    		frms.push(img.buffer.slice(0));
    		
    		if     (frm.dispose==0) ;
    		else if(frm.dispose==1) UPNG._copyTile(empty, fw, fh, img, w, h, fx, fy, 0);
    		else if(frm.dispose==2) for(var j=0; j<len; j++) img[j]=prev[j];
    	}
    	return frms;
    };
    UPNG.toRGBA8.decodeImage = function(data, w, h, out)
    {
    	var area = w*h, bpp = UPNG.decode._getBPP(out);
    	var bpl = Math.ceil(w*bpp/8);	// bytes per line

    	var bf = new Uint8Array(area*4), bf32 = new Uint32Array(bf.buffer);
    	var ctype = out.ctype, depth = out.depth;
    	var rs = UPNG._bin.readUshort;

    	if     (ctype==6) { // RGB + alpha
    		var qarea = area<<2;
    		if(depth== 8) for(var i=0; i<qarea;i+=4) {  bf[i] = data[i];  bf[i+1] = data[i+1];  bf[i+2] = data[i+2];  bf[i+3] = data[i+3]; }
    		if(depth==16) for(var i=0; i<qarea;i++ ) {  bf[i] = data[i<<1];  }
    	}
    	else if(ctype==2) {	// RGB
    		var ts=out.tabs["tRNS"];
    		if(ts==null) {
    			if(depth== 8) for(var i=0; i<area; i++) {  var ti=i*3;  bf32[i] = (255<<24)|(data[ti+2]<<16)|(data[ti+1]<<8)|data[ti];  }
    			if(depth==16) for(var i=0; i<area; i++) {  var ti=i*6;  bf32[i] = (255<<24)|(data[ti+4]<<16)|(data[ti+2]<<8)|data[ti];  }
    		}
    		else {  var tr=ts[0], tg=ts[1], tb=ts[2];
    			if(depth== 8) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*3;  bf32[i] = (255<<24)|(data[ti+2]<<16)|(data[ti+1]<<8)|data[ti];
    				if(data[ti]   ==tr && data[ti+1]   ==tg && data[ti+2]   ==tb) bf[qi+3] = 0;  }
    			if(depth==16) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*6;  bf32[i] = (255<<24)|(data[ti+4]<<16)|(data[ti+2]<<8)|data[ti];
    				if(rs(data,ti)==tr && rs(data,ti+2)==tg && rs(data,ti+4)==tb) bf[qi+3] = 0;  }
    		}
    	}
    	else if(ctype==3) {	// palette
    		var p=out.tabs["PLTE"], ap=out.tabs["tRNS"], tl=ap?ap.length:0;
    		//console.log(p, ap);
    		if(depth==1) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
    			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>3)]>>(7-((i&7)<<0)))& 1), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
    		}
    		if(depth==2) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
    			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>2)]>>(6-((i&3)<<1)))& 3), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
    		}
    		if(depth==4) for(var y=0; y<h; y++) {  var s0 = y*bpl, t0 = y*w;
    			for(var i=0; i<w; i++) { var qi=(t0+i)<<2, j=((data[s0+(i>>1)]>>(4-((i&1)<<2)))&15), cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
    		}
    		if(depth==8) for(var i=0; i<area; i++ ) {  var qi=i<<2, j=data[i]                      , cj=3*j;  bf[qi]=p[cj];  bf[qi+1]=p[cj+1];  bf[qi+2]=p[cj+2];  bf[qi+3]=(j<tl)?ap[j]:255;  }
    	}
    	else if(ctype==4) {	// gray + alpha
    		if(depth== 8)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<1, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+1];  }
    		if(depth==16)  for(var i=0; i<area; i++) {  var qi=i<<2, di=i<<2, gr=data[di];  bf[qi]=gr;  bf[qi+1]=gr;  bf[qi+2]=gr;  bf[qi+3]=data[di+2];  }
    	}
    	else if(ctype==0) {	// gray
    		var tr = out.tabs["tRNS"] ? out.tabs["tRNS"] : -1;
    		for(var y=0; y<h; y++) {
    			var off = y*bpl, to = y*w;
    			if     (depth== 1) for(var x=0; x<w; x++) {  var gr=255*((data[off+(x>>>3)]>>>(7 -((x&7)   )))& 1), al=(gr==tr*255)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
    			else if(depth== 2) for(var x=0; x<w; x++) {  var gr= 85*((data[off+(x>>>2)]>>>(6 -((x&3)<<1)))& 3), al=(gr==tr* 85)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
    			else if(depth== 4) for(var x=0; x<w; x++) {  var gr= 17*((data[off+(x>>>1)]>>>(4 -((x&1)<<2)))&15), al=(gr==tr* 17)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
    			else if(depth== 8) for(var x=0; x<w; x++) {  var gr=data[off+     x], al=(gr                 ==tr)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
    			else if(depth==16) for(var x=0; x<w; x++) {  var gr=data[off+(x<<1)], al=(rs(data,off+(x<<i))==tr)?0:255;  bf32[to+x]=(al<<24)|(gr<<16)|(gr<<8)|gr;  }
    		}
    	}
    	//console.log(Date.now()-time);
    	return bf;
    };



    UPNG.decode = function(buff)
    {
    	var data = new Uint8Array(buff), offset = 8, bin = UPNG._bin, rUs = bin.readUshort, rUi = bin.readUint;
    	var out = {tabs:{}, frames:[]};
    	var dd = new Uint8Array(data.length), doff = 0;	 // put all IDAT data into it
    	var fd, foff = 0;	// frames
    	
    	var mgck = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    	for(var i=0; i<8; i++) if(data[i]!=mgck[i]) throw "The input is not a PNG file!";

    	while(offset<data.length)
    	{
    		var len  = bin.readUint(data, offset);  offset += 4;
    		var type = bin.readASCII(data, offset, 4);  offset += 4;
    		//console.log(type,len);
    		
    		if     (type=="IHDR")  {  UPNG.decode._IHDR(data, offset, out);  }
    		else if(type=="IDAT") {
    			for(var i=0; i<len; i++) dd[doff+i] = data[offset+i];
    			doff += len;
    		}
    		else if(type=="acTL")  {
    			out.tabs[type] = {  num_frames:rUi(data, offset), num_plays:rUi(data, offset+4)  };
    			fd = new Uint8Array(data.length);
    		}
    		else if(type=="fcTL")  {
    			if(foff!=0) {  var fr = out.frames[out.frames.length-1];
    				fr.data = UPNG.decode._decompress(out, fd.slice(0,foff), fr.rect.width, fr.rect.height);  foff=0;
    			}
    			var rct = {x:rUi(data, offset+12),y:rUi(data, offset+16),width:rUi(data, offset+4),height:rUi(data, offset+8)};
    			var del = rUs(data, offset+22);  del = rUs(data, offset+20) / (del==0?100:del);
    			var frm = {rect:rct, delay:Math.round(del*1000), dispose:data[offset+24], blend:data[offset+25]};
    			//console.log(frm);
    			out.frames.push(frm);
    		}
    		else if(type=="fdAT") {
    			for(var i=0; i<len-4; i++) fd[foff+i] = data[offset+i+4];
    			foff += len-4;
    		}
    		else if(type=="pHYs") {
    			out.tabs[type] = [bin.readUint(data, offset), bin.readUint(data, offset+4), data[offset+8]];
    		}
    		else if(type=="cHRM") {
    			out.tabs[type] = [];
    			for(var i=0; i<8; i++) out.tabs[type].push(bin.readUint(data, offset+i*4));
    		}
    		else if(type=="tEXt") {
    			if(out.tabs[type]==null) out.tabs[type] = {};
    			var nz = bin.nextZero(data, offset);
    			var keyw = bin.readASCII(data, offset, nz-offset);
    			var text = bin.readASCII(data, nz+1, offset+len-nz-1);
    			out.tabs[type][keyw] = text;
    		}
    		else if(type=="iTXt") {
    			if(out.tabs[type]==null) out.tabs[type] = {};
    			var nz = 0, off = offset;
    			nz = bin.nextZero(data, off);
    			var keyw = bin.readASCII(data, off, nz-off);  off = nz + 1;
      off+=2;
    			nz = bin.nextZero(data, off);
    			var ltag = bin.readASCII(data, off, nz-off);  off = nz + 1;
    			nz = bin.nextZero(data, off);
    			var tkeyw = bin.readUTF8(data, off, nz-off);  off = nz + 1;
    			var text  = bin.readUTF8(data, off, len-(off-offset));
    			out.tabs[type][keyw] = text;
    		}
    		else if(type=="PLTE") {
    			out.tabs[type] = bin.readBytes(data, offset, len);
    		}
    		else if(type=="hIST") {
    			var pl = out.tabs["PLTE"].length/3;
    			out.tabs[type] = [];  for(var i=0; i<pl; i++) out.tabs[type].push(rUs(data, offset+i*2));
    		}
    		else if(type=="tRNS") {
    			if     (out.ctype==3) out.tabs[type] = bin.readBytes(data, offset, len);
    			else if(out.ctype==0) out.tabs[type] = rUs(data, offset);
    			else if(out.ctype==2) out.tabs[type] = [ rUs(data,offset),rUs(data,offset+2),rUs(data,offset+4) ];
    			//else console.log("tRNS for unsupported color type",out.ctype, len);
    		}
    		else if(type=="gAMA") out.tabs[type] = bin.readUint(data, offset)/100000;
    		else if(type=="sRGB") out.tabs[type] = data[offset];
    		else if(type=="bKGD")
    		{
    			if     (out.ctype==0 || out.ctype==4) out.tabs[type] = [rUs(data, offset)];
    			else if(out.ctype==2 || out.ctype==6) out.tabs[type] = [rUs(data, offset), rUs(data, offset+2), rUs(data, offset+4)];
    			else if(out.ctype==3) out.tabs[type] = data[offset];
    		}
    		else if(type=="IEND") {
    			break;
    		}
    		//else {  log("unknown chunk type", type, len);  }
    		offset += len;
    		var crc = bin.readUint(data, offset);  offset += 4;
    	}
    	if(foff!=0) {  var fr = out.frames[out.frames.length-1];
    		fr.data = UPNG.decode._decompress(out, fd.slice(0,foff), fr.rect.width, fr.rect.height);  foff=0;
    	}	
    	out.data = UPNG.decode._decompress(out, dd, out.width, out.height);
    	
    	delete out.compress;  delete out.interlace;  delete out.filter;
    	return out;
    };

    UPNG.decode._decompress = function(out, dd, w, h) {
    	var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w*bpp/8), buff = new Uint8Array((bpl+1+out.interlace)*h);
    	dd = UPNG.decode._inflate(dd,buff);
    	if     (out.interlace==0) dd = UPNG.decode._filterZero(dd, out, 0, w, h);
    	else if(out.interlace==1) dd = UPNG.decode._readInterlace(dd, out);
    	//console.log(Date.now()-time);
    	return dd;
    };

    UPNG.decode._inflate = function(data, buff) {  var out=UPNG["inflateRaw"](new Uint8Array(data.buffer, 2,data.length-6),buff);  return out;  };
    UPNG.inflateRaw=function(){var H={};H.H={};H.H.N=function(N,W){var R=Uint8Array,i=0,m=0,J=0,h=0,Q=0,X=0,u=0,w=0,d=0,v,C;
    if(N[0]==3&&N[1]==0)return W?W:new R(0);var V=H.H,n=V.b,A=V.e,l=V.R,M=V.n,I=V.A,e=V.Z,b=V.m,Z=W==null;
    if(Z)W=new R(N.length>>>2<<3);while(i==0){i=n(N,d,1);m=n(N,d+1,2);d+=3;if(m==0){if((d&7)!=0)d+=8-(d&7);
    var D=(d>>>3)+4,q=N[D-4]|N[D-3]<<8;if(Z)W=H.H.W(W,w+q);W.set(new R(N.buffer,N.byteOffset+D,q),w);d=D+q<<3;
    w+=q;continue}if(Z)W=H.H.W(W,w+(1<<17));if(m==1){v=b.J;C=b.h;X=(1<<9)-1;u=(1<<5)-1;}if(m==2){J=A(N,d,5)+257;
    h=A(N,d+5,5)+1;Q=A(N,d+10,4)+4;d+=14;var j=1;for(var c=0;c<38;c+=2){b.Q[c]=0;b.Q[c+1]=0;}for(var c=0;
    c<Q;c++){var K=A(N,d+c*3,3);b.Q[(b.X[c]<<1)+1]=K;if(K>j)j=K;}d+=3*Q;M(b.Q,j);I(b.Q,j,b.u);v=b.w;C=b.d;
    d=l(b.u,(1<<j)-1,J+h,N,d,b.v);var r=V.V(b.v,0,J,b.C);X=(1<<r)-1;var S=V.V(b.v,J,h,b.D);u=(1<<S)-1;M(b.C,r);
    I(b.C,r,v);M(b.D,S);I(b.D,S,C);}while(!0){var T=v[e(N,d)&X];d+=T&15;var p=T>>>4;if(p>>>8==0){W[w++]=p;}else if(p==256){break}else {var z=w+p-254;
    if(p>264){var _=b.q[p-257];z=w+(_>>>3)+A(N,d,_&7);d+=_&7;}var $=C[e(N,d)&u];d+=$&15;var s=$>>>4,Y=b.c[s],a=(Y>>>4)+n(N,d,Y&15);
    d+=Y&15;while(w<z){W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a];W[w]=W[w++-a];}w=z;}}}return W.length==w?W:W.slice(0,w)};
    H.H.W=function(N,W){var R=N.length;if(W<=R)return N;var V=new Uint8Array(R<<1);V.set(N,0);return V};
    H.H.R=function(N,W,R,V,n,A){var l=H.H.e,M=H.H.Z,I=0;while(I<R){var e=N[M(V,n)&W];n+=e&15;var b=e>>>4;
    if(b<=15){A[I]=b;I++;}else {var Z=0,m=0;if(b==16){m=3+l(V,n,2);n+=2;Z=A[I-1];}else if(b==17){m=3+l(V,n,3);
    n+=3;}else if(b==18){m=11+l(V,n,7);n+=7;}var J=I+m;while(I<J){A[I]=Z;I++;}}}return n};H.H.V=function(N,W,R,V){var n=0,A=0,l=V.length>>>1;
    while(A<R){var M=N[A+W];V[A<<1]=0;V[(A<<1)+1]=M;if(M>n)n=M;A++;}while(A<l){V[A<<1]=0;V[(A<<1)+1]=0;A++;}return n};
    H.H.n=function(N,W){var R=H.H.m,V=N.length,n,A,l,M,I,e=R.j;for(var M=0;M<=W;M++)e[M]=0;for(M=1;M<V;M+=2)e[N[M]]++;
    var b=R.K;n=0;e[0]=0;for(A=1;A<=W;A++){n=n+e[A-1]<<1;b[A]=n;}for(l=0;l<V;l+=2){I=N[l+1];if(I!=0){N[l]=b[I];
    b[I]++;}}};H.H.A=function(N,W,R){var V=N.length,n=H.H.m,A=n.r;for(var l=0;l<V;l+=2)if(N[l+1]!=0){var M=l>>1,I=N[l+1],e=M<<4|I,b=W-I,Z=N[l]<<b,m=Z+(1<<b);
    while(Z!=m){var J=A[Z]>>>15-W;R[J]=e;Z++;}}};H.H.l=function(N,W){var R=H.H.m.r,V=15-W;for(var n=0;n<N.length;
    n+=2){var A=N[n]<<W-N[n+1];N[n]=R[A]>>>V;}};H.H.M=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8;};
    H.H.I=function(N,W,R){R=R<<(W&7);var V=W>>>3;N[V]|=R;N[V+1]|=R>>>8;N[V+2]|=R>>>16;};H.H.e=function(N,W,R){return (N[W>>>3]|N[(W>>>3)+1]<<8)>>>(W&7)&(1<<R)-1};
    H.H.b=function(N,W,R){return (N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)&(1<<R)-1};H.H.Z=function(N,W){return (N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16)>>>(W&7)};
    H.H.i=function(N,W){return (N[W>>>3]|N[(W>>>3)+1]<<8|N[(W>>>3)+2]<<16|N[(W>>>3)+3]<<24)>>>(W&7)};H.H.m=function(){var N=Uint16Array,W=Uint32Array;
    return {K:new N(16),j:new N(16),X:[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],S:[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,999,999,999],T:[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0],q:new N(32),p:[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,65535,65535],z:[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0],c:new W(32),J:new N(512),_:[],h:new N(32),$:[],w:new N(32768),C:[],v:[],d:new N(32768),D:[],u:new N(512),Q:[],r:new N(1<<15),s:new W(286),Y:new W(30),a:new W(19),t:new W(15e3),k:new N(1<<16),g:new N(1<<15)}}();
    (function(){var N=H.H.m,W=1<<15;for(var R=0;R<W;R++){var V=R;V=(V&2863311530)>>>1|(V&1431655765)<<1;
    V=(V&3435973836)>>>2|(V&858993459)<<2;V=(V&4042322160)>>>4|(V&252645135)<<4;V=(V&4278255360)>>>8|(V&16711935)<<8;
    N.r[R]=(V>>>16|V<<16)>>>17;}function n(A,l,M){while(l--!=0)A.push(0,M);}for(var R=0;R<32;R++){N.q[R]=N.S[R]<<3|N.T[R];
    N.c[R]=N.p[R]<<4|N.z[R];}n(N._,144,8);n(N._,255-143,9);n(N._,279-255,7);n(N._,287-279,8);H.H.n(N._,9);
    H.H.A(N._,9,N.J);H.H.l(N._,9);n(N.$,32,5);H.H.n(N.$,5);H.H.A(N.$,5,N.h);H.H.l(N.$,5);n(N.Q,19,0);n(N.C,286,0);
    n(N.D,30,0);n(N.v,320,0);}());return H.H.N}();


    UPNG.decode._readInterlace = function(data, out)
    {
    	var w = out.width, h = out.height;
    	var bpp = UPNG.decode._getBPP(out), cbpp = bpp>>3, bpl = Math.ceil(w*bpp/8);
    	var img = new Uint8Array( h * bpl );
    	var di = 0;

    	var starting_row  = [ 0, 0, 4, 0, 2, 0, 1 ];
    	var starting_col  = [ 0, 4, 0, 2, 0, 1, 0 ];
    	var row_increment = [ 8, 8, 8, 4, 4, 2, 2 ];
    	var col_increment = [ 8, 8, 4, 4, 2, 2, 1 ];

    	var pass=0;
    	while(pass<7)
    	{
    		var ri = row_increment[pass], ci = col_increment[pass];
    		var sw = 0, sh = 0;
    		var cr = starting_row[pass];  while(cr<h) {  cr+=ri;  sh++;  }
    		var cc = starting_col[pass];  while(cc<w) {  cc+=ci;  sw++;  }
    		var bpll = Math.ceil(sw*bpp/8);
    		UPNG.decode._filterZero(data, out, di, sw, sh);

    		var y=0, row = starting_row[pass];
    		while(row<h)
    		{
    			var col = starting_col[pass];
    			var cdi = (di+y*bpll)<<3;

    			while(col<w)
    			{
    				if(bpp==1) {
    					var val = data[cdi>>3];  val = (val>>(7-(cdi&7)))&1;
    					img[row*bpl + (col>>3)] |= (val << (7-((col&7)<<0)));
    				}
    				if(bpp==2) {
    					var val = data[cdi>>3];  val = (val>>(6-(cdi&7)))&3;
    					img[row*bpl + (col>>2)] |= (val << (6-((col&3)<<1)));
    				}
    				if(bpp==4) {
    					var val = data[cdi>>3];  val = (val>>(4-(cdi&7)))&15;
    					img[row*bpl + (col>>1)] |= (val << (4-((col&1)<<2)));
    				}
    				if(bpp>=8) {
    					var ii = row*bpl+col*cbpp;
    					for(var j=0; j<cbpp; j++) img[ii+j] = data[(cdi>>3)+j];
    				}
    				cdi+=bpp;  col+=ci;
    			}
    			y++;  row += ri;
    		}
    		if(sw*sh!=0) di += sh * (1 + bpll);
    		pass = pass + 1;
    	}
    	return img;
    };

    UPNG.decode._getBPP = function(out) {
    	var noc = [1,null,3,1,2,null,4][out.ctype];
    	return noc * out.depth;
    };

    UPNG.decode._filterZero = function(data, out, off, w, h)
    {
    	var bpp = UPNG.decode._getBPP(out), bpl = Math.ceil(w*bpp/8), paeth = UPNG.decode._paeth;
    	bpp = Math.ceil(bpp/8);
    	
    	var i=0, di=1, type=data[off], x=0;
    	
    	if(type>1) data[off]=[0,0,1][type-2];  
    	if(type==3) for(x=bpp; x<bpl; x++) data[x+1] = (data[x+1] + (data[x+1-bpp]>>>1) )&255;

    	for(var y=0; y<h; y++)  {
    		i = off+y*bpl; di = i+y+1;
    		type = data[di-1]; x=0;

    		if     (type==0)   for(; x<bpl; x++) data[i+x] = data[di+x];
    		else if(type==1) { for(; x<bpp; x++) data[i+x] = data[di+x];
    						   for(; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpp]);  }
    		else if(type==2) { for(; x<bpl; x++) data[i+x] = (data[di+x] + data[i+x-bpl]);  }
    		else if(type==3) { for(; x<bpp; x++) data[i+x] = (data[di+x] + ( data[i+x-bpl]>>>1));
    			               for(; x<bpl; x++) data[i+x] = (data[di+x] + ((data[i+x-bpl]+data[i+x-bpp])>>>1) );  }
    		else             { for(; x<bpp; x++) data[i+x] = (data[di+x] + paeth(0, data[i+x-bpl], 0));
    						   for(; x<bpl; x++) data[i+x] = (data[di+x] + paeth(data[i+x-bpp], data[i+x-bpl], data[i+x-bpp-bpl]) );  }
    	}
    	return data;
    };

    UPNG.decode._paeth = function(a,b,c)
    {
    	var p = a+b-c, pa = (p-a), pb = (p-b), pc = (p-c);
    	if (pa*pa <= pb*pb && pa*pa <= pc*pc)  return a;
    	else if (pb*pb <= pc*pc)  return b;
    	return c;
    };

    UPNG.decode._IHDR = function(data, offset, out)
    {
    	var bin = UPNG._bin;
    	out.width  = bin.readUint(data, offset);  offset += 4;
    	out.height = bin.readUint(data, offset);  offset += 4;
    	out.depth     = data[offset];  offset++;
    	out.ctype     = data[offset];  offset++;
    	out.compress  = data[offset];  offset++;
    	out.filter    = data[offset];  offset++;
    	out.interlace = data[offset];  offset++;
    };

    UPNG._bin = {
    	nextZero   : function(data,p)  {  while(data[p]!=0) p++;  return p;  },
    	readUshort : function(buff,p)  {  return (buff[p]<< 8) | buff[p+1];  },
    	writeUshort: function(buff,p,n){  buff[p] = (n>>8)&255;  buff[p+1] = n&255;  },
    	readUint   : function(buff,p)  {  return (buff[p]*(256*256*256)) + ((buff[p+1]<<16) | (buff[p+2]<< 8) | buff[p+3]);  },
    	writeUint  : function(buff,p,n){  buff[p]=(n>>24)&255;  buff[p+1]=(n>>16)&255;  buff[p+2]=(n>>8)&255;  buff[p+3]=n&255;  },
    	readASCII  : function(buff,p,l){  var s = "";  for(var i=0; i<l; i++) s += String.fromCharCode(buff[p+i]);  return s;    },
    	writeASCII : function(data,p,s){  for(var i=0; i<s.length; i++) data[p+i] = s.charCodeAt(i);  },
    	readBytes  : function(buff,p,l){  var arr = [];   for(var i=0; i<l; i++) arr.push(buff[p+i]);   return arr;  },
    	pad : function(n) { return n.length < 2 ? "0" + n : n; },
    	readUTF8 : function(buff, p, l) {
    		var s = "", ns;
    		for(var i=0; i<l; i++) s += "%" + UPNG._bin.pad(buff[p+i].toString(16));
    		try {  ns = decodeURIComponent(s); }
    		catch(e) {  return UPNG._bin.readASCII(buff, p, l);  }
    		return  ns;
    	}
    };
    UPNG._copyTile = function(sb, sw, sh, tb, tw, th, xoff, yoff, mode)
    {
    	var w = Math.min(sw,tw), h = Math.min(sh,th);
    	var si=0, ti=0;
    	for(var y=0; y<h; y++)
    		for(var x=0; x<w; x++)
    		{
    			if(xoff>=0 && yoff>=0) {  si = (y*sw+x)<<2;  ti = (( yoff+y)*tw+xoff+x)<<2;  }
    			else                   {  si = ((-yoff+y)*sw-xoff+x)<<2;  ti = (y*tw+x)<<2;  }
    			
    			if     (mode==0) {  tb[ti] = sb[si];  tb[ti+1] = sb[si+1];  tb[ti+2] = sb[si+2];  tb[ti+3] = sb[si+3];  }
    			else if(mode==1) {
    				var fa = sb[si+3]*(1/255), fr=sb[si]*fa, fg=sb[si+1]*fa, fb=sb[si+2]*fa; 
    				var ba = tb[ti+3]*(1/255), br=tb[ti]*ba, bg=tb[ti+1]*ba, bb=tb[ti+2]*ba; 
    				
    				var ifa=1-fa, oa = fa+ba*ifa, ioa = (oa==0?0:1/oa);
    				tb[ti+3] = 255*oa;  
    				tb[ti+0] = (fr+br*ifa)*ioa;  
    				tb[ti+1] = (fg+bg*ifa)*ioa;   
    				tb[ti+2] = (fb+bb*ifa)*ioa;  
    			}
    			else if(mode==2){	// copy only differences, otherwise zero
    				var fa = sb[si+3], fr=sb[si], fg=sb[si+1], fb=sb[si+2]; 
    				var ba = tb[ti+3], br=tb[ti], bg=tb[ti+1], bb=tb[ti+2]; 
    				if(fa==ba && fr==br && fg==bg && fb==bb) {  tb[ti]=0;  tb[ti+1]=0;  tb[ti+2]=0;  tb[ti+3]=0;  }
    				else {  tb[ti]=fr;  tb[ti+1]=fg;  tb[ti+2]=fb;  tb[ti+3]=fa;  }
    			}
    			else if(mode==3){	// check if can be blended
    				var fa = sb[si+3], fr=sb[si], fg=sb[si+1], fb=sb[si+2]; 
    				var ba = tb[ti+3], br=tb[ti], bg=tb[ti+1], bb=tb[ti+2]; 
    				if(fa==ba && fr==br && fg==bg && fb==bb) continue;
    				//if(fa!=255 && ba!=0) return false;
    				if(fa<220 && ba>20) return false;
    			}
    		}
    	return true;
    };




    UPNG.encode = function(bufs, w, h, ps, dels, tabs, forbidPlte)
    {
    	if(ps==null) ps=0;
    	if(forbidPlte==null) forbidPlte = false;

    	var nimg = UPNG.encode.compress(bufs, w, h, ps, [false, false, false, 0, forbidPlte]);
    	UPNG.encode.compressPNG(nimg, -1);
    	
    	return UPNG.encode._main(nimg, w, h, dels, tabs);
    };

    UPNG.encodeLL = function(bufs, w, h, cc, ac, depth, dels, tabs) {
    	var nimg = {  ctype: 0 + (cc==1 ? 0 : 2) + (ac==0 ? 0 : 4),      depth: depth,  frames: []  };
    	var bipp = (cc+ac)*depth, bipl = bipp * w;
    	for(var i=0; i<bufs.length; i++)
    		nimg.frames.push({  rect:{x:0,y:0,width:w,height:h},  img:new Uint8Array(bufs[i]), blend:0, dispose:1, bpp:Math.ceil(bipp/8), bpl:Math.ceil(bipl/8)  });
    	
    	UPNG.encode.compressPNG(nimg, 0, true);
    	
    	var out = UPNG.encode._main(nimg, w, h, dels, tabs);
    	return out;
    };

    UPNG.encode._main = function(nimg, w, h, dels, tabs) {
    	if(tabs==null) tabs={};
    	var crc = UPNG.crc.crc, wUi = UPNG._bin.writeUint, wUs = UPNG._bin.writeUshort, wAs = UPNG._bin.writeASCII;
    	var offset = 8, anim = nimg.frames.length>1, pltAlpha = false;
    	
    	var leng = 8 + (16+5+4) /*+ (9+4)*/ + (anim ? 20 : 0);
    	if(tabs["sRGB"]!=null) leng += 8+1+4;
    	if(tabs["pHYs"]!=null) leng += 8+9+4;
    	if(nimg.ctype==3) {
    		var dl = nimg.plte.length;
    		for(var i=0; i<dl; i++) if((nimg.plte[i]>>>24)!=255) pltAlpha = true;
    		leng += (8 + dl*3 + 4) + (pltAlpha ? (8 + dl*1 + 4) : 0);
    	}
    	for(var j=0; j<nimg.frames.length; j++)
    	{
    		var fr = nimg.frames[j];
    		if(anim) leng += 38;
    		leng += fr.cimg.length + 12;
    		if(j!=0) leng+=4;
    	}
    	leng += 12; 
    	
    	var data = new Uint8Array(leng);
    	var wr=[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    	for(var i=0; i<8; i++) data[i]=wr[i];
    	
    	wUi(data,offset, 13);     offset+=4;
    	wAs(data,offset,"IHDR");  offset+=4;
    	wUi(data,offset,w);  offset+=4;
    	wUi(data,offset,h);  offset+=4;
    	data[offset] = nimg.depth;  offset++;  // depth
    	data[offset] = nimg.ctype;  offset++;  // ctype
    	data[offset] = 0;  offset++;  // compress
    	data[offset] = 0;  offset++;  // filter
    	data[offset] = 0;  offset++;  // interlace
    	wUi(data,offset,crc(data,offset-17,17));  offset+=4; // crc

    	// 13 bytes to say, that it is sRGB
    	if(tabs["sRGB"]!=null) {
    		wUi(data,offset, 1);      offset+=4;
    		wAs(data,offset,"sRGB");  offset+=4;
    		data[offset] = tabs["sRGB"];  offset++;
    		wUi(data,offset,crc(data,offset-5,5));  offset+=4; // crc
    	}
    	if(tabs["pHYs"]!=null) {
    		wUi(data,offset, 9);      offset+=4;
    		wAs(data,offset,"pHYs");  offset+=4;
    		wUi(data,offset, tabs["pHYs"][0]);      offset+=4;
    		wUi(data,offset, tabs["pHYs"][1]);      offset+=4;
    		data[offset]=tabs["pHYs"][2];			offset++;
    		wUi(data,offset,crc(data,offset-13,13));  offset+=4; // crc
    	}

    	if(anim) {
    		wUi(data,offset, 8);      offset+=4;
    		wAs(data,offset,"acTL");  offset+=4;
    		wUi(data,offset, nimg.frames.length);     offset+=4;
    		wUi(data,offset, tabs["loop"]!=null?tabs["loop"]:0);      offset+=4;
    		wUi(data,offset,crc(data,offset-12,12));  offset+=4; // crc
    	}

    	if(nimg.ctype==3) {
    		var dl = nimg.plte.length;
    		wUi(data,offset, dl*3);  offset+=4;
    		wAs(data,offset,"PLTE");  offset+=4;
    		for(var i=0; i<dl; i++){
    			var ti=i*3, c=nimg.plte[i], r=(c)&255, g=(c>>>8)&255, b=(c>>>16)&255;
    			data[offset+ti+0]=r;  data[offset+ti+1]=g;  data[offset+ti+2]=b;
    		}
    		offset+=dl*3;
    		wUi(data,offset,crc(data,offset-dl*3-4,dl*3+4));  offset+=4; // crc

    		if(pltAlpha) {
    			wUi(data,offset, dl);  offset+=4;
    			wAs(data,offset,"tRNS");  offset+=4;
    			for(var i=0; i<dl; i++)  data[offset+i]=(nimg.plte[i]>>>24)&255;
    			offset+=dl;
    			wUi(data,offset,crc(data,offset-dl-4,dl+4));  offset+=4; // crc
    		}
    	}
    	
    	var fi = 0;
    	for(var j=0; j<nimg.frames.length; j++)
    	{
    		var fr = nimg.frames[j];
    		if(anim) {
    			wUi(data, offset, 26);     offset+=4;
    			wAs(data, offset,"fcTL");  offset+=4;
    			wUi(data, offset, fi++);   offset+=4;
    			wUi(data, offset, fr.rect.width );   offset+=4;
    			wUi(data, offset, fr.rect.height);   offset+=4;
    			wUi(data, offset, fr.rect.x);   offset+=4;
    			wUi(data, offset, fr.rect.y);   offset+=4;
    			wUs(data, offset, dels[j]);   offset+=2;
    			wUs(data, offset,  1000);   offset+=2;
    			data[offset] = fr.dispose;  offset++;	// dispose
    			data[offset] = fr.blend  ;  offset++;	// blend
    			wUi(data,offset,crc(data,offset-30,30));  offset+=4; // crc
    		}
    				
    		var imgd = fr.cimg, dl = imgd.length;
    		wUi(data,offset, dl+(j==0?0:4));     offset+=4;
    		var ioff = offset;
    		wAs(data,offset,(j==0)?"IDAT":"fdAT");  offset+=4;
    		if(j!=0) {  wUi(data, offset, fi++);  offset+=4;  }
    		data.set(imgd,offset);
    		offset += dl;
    		wUi(data,offset,crc(data,ioff,offset-ioff));  offset+=4; // crc
    	}

    	wUi(data,offset, 0);     offset+=4;
    	wAs(data,offset,"IEND");  offset+=4;
    	wUi(data,offset,crc(data,offset-4,4));  offset+=4; // crc

    	return data.buffer;
    };

    UPNG.encode.compressPNG = function(out, filter, levelZero) {
    	for(var i=0; i<out.frames.length; i++) {
    		var frm = out.frames[i], nw=frm.rect.width, nh=frm.rect.height;
    		var fdata = new Uint8Array(nh*frm.bpl+nh);
    		frm.cimg = UPNG.encode._filterZero(frm.img,nh,frm.bpp,frm.bpl,fdata, filter, levelZero);
    	}
    };



    UPNG.encode.compress = function(bufs, w, h, ps, prms) // prms:  onlyBlend, minBits, forbidPlte
    {
    	//var time = Date.now();
    	var onlyBlend = prms[0], evenCrd = prms[1], forbidPrev = prms[2], minBits = prms[3], forbidPlte = prms[4];
    	
    	var ctype = 6, depth = 8, alphaAnd=255;
    	
    	for(var j=0; j<bufs.length; j++)  {  // when not quantized, other frames can contain colors, that are not in an initial frame
    		var img = new Uint8Array(bufs[j]), ilen = img.length;
    		for(var i=0; i<ilen; i+=4) alphaAnd &= img[i+3];
    	}
    	var gotAlpha = (alphaAnd!=255);
    	
    	//console.log("alpha check", Date.now()-time);  time = Date.now();
    	
    	//var brute = gotAlpha && forGIF;		// brute : frames can only be copied, not "blended"
    	var frms = UPNG.encode.framize(bufs, w, h, onlyBlend, evenCrd, forbidPrev);
    	//console.log("framize", Date.now()-time);  time = Date.now();
    	
    	var cmap={}, plte=[], inds=[];  
    	
    	if(ps!=0) {
    		var nbufs = [];  for(var i=0; i<frms.length; i++) nbufs.push(frms[i].img.buffer);
    		
    		var abuf = UPNG.encode.concatRGBA(nbufs), qres = UPNG.quantize(abuf, ps);  
    		var cof = 0, bb = new Uint8Array(qres.abuf);
    		for(var i=0; i<frms.length; i++) {  var ti=frms[i].img, bln=ti.length;  inds.push(new Uint8Array(qres.inds.buffer, cof>>2, bln>>2));
    			for(var j=0; j<bln; j+=4) {  ti[j]=bb[cof+j];  ti[j+1]=bb[cof+j+1];  ti[j+2]=bb[cof+j+2];  ti[j+3]=bb[cof+j+3];  }    cof+=bln;  }
    		
    		for(var i=0; i<qres.plte.length; i++) plte.push(qres.plte[i].est.rgba);
    		//console.log("quantize", Date.now()-time);  time = Date.now();
    	}
    	else {
    		// what if ps==0, but there are <=256 colors?  we still need to detect, if the palette could be used
    		for(var j=0; j<frms.length; j++)  {  // when not quantized, other frames can contain colors, that are not in an initial frame
    			var frm = frms[j], img32 = new Uint32Array(frm.img.buffer), nw=frm.rect.width, ilen = img32.length;
    			var ind = new Uint8Array(ilen);  inds.push(ind);
    			for(var i=0; i<ilen; i++) {
    				var c = img32[i];
    				if     (i!=0 && c==img32[i- 1]) ind[i]=ind[i-1];
    				else if(i>nw && c==img32[i-nw]) ind[i]=ind[i-nw];
    				else {
    					var cmc = cmap[c];
    					if(cmc==null) {  cmap[c]=cmc=plte.length;  plte.push(c);  if(plte.length>=300) break;  }
    					ind[i]=cmc;
    				}
    			}
    		}
    		//console.log("make palette", Date.now()-time);  time = Date.now();
    	}
    	
    	var cc=plte.length; //console.log("colors:",cc);
    	if(cc<=256 && forbidPlte==false) {
    		if(cc<= 2) depth=1;  else if(cc<= 4) depth=2;  else if(cc<=16) depth=4;  else depth=8;
    		depth =  Math.max(depth, minBits);
    	}
    	
    	for(var j=0; j<frms.length; j++)
    	{
    		var frm = frms[j], nx=frm.rect.x, ny=frm.rect.y, nw=frm.rect.width, nh=frm.rect.height;
    		var cimg = frm.img, cimg32 = new Uint32Array(cimg.buffer);
    		var bpl = 4*nw, bpp=4;
    		if(cc<=256 && forbidPlte==false) {
    			bpl = Math.ceil(depth*nw/8);
    			var nimg = new Uint8Array(bpl*nh);
    			var inj = inds[j];
    			for(var y=0; y<nh; y++) {  var i=y*bpl, ii=y*nw;
    				if     (depth==8) for(var x=0; x<nw; x++) nimg[i+(x)   ]   =  (inj[ii+x]             );
    				else if(depth==4) for(var x=0; x<nw; x++) nimg[i+(x>>1)]  |=  (inj[ii+x]<<(4-(x&1)*4));
    				else if(depth==2) for(var x=0; x<nw; x++) nimg[i+(x>>2)]  |=  (inj[ii+x]<<(6-(x&3)*2));
    				else if(depth==1) for(var x=0; x<nw; x++) nimg[i+(x>>3)]  |=  (inj[ii+x]<<(7-(x&7)*1));
    			}
    			cimg=nimg;  ctype=3;  bpp=1;
    		}
    		else if(gotAlpha==false && frms.length==1) {	// some next "reduced" frames may contain alpha for blending
    			var nimg = new Uint8Array(nw*nh*3), area=nw*nh;
    			for(var i=0; i<area; i++) { var ti=i*3, qi=i*4;  nimg[ti]=cimg[qi];  nimg[ti+1]=cimg[qi+1];  nimg[ti+2]=cimg[qi+2];  }
    			cimg=nimg;  ctype=2;  bpp=3;  bpl=3*nw;
    		}
    		frm.img=cimg;  frm.bpl=bpl;  frm.bpp=bpp;
    	}
    	//console.log("colors => palette indices", Date.now()-time);  time = Date.now();
    	
    	return {ctype:ctype, depth:depth, plte:plte, frames:frms  };
    };
    UPNG.encode.framize = function(bufs,w,h,alwaysBlend,evenCrd,forbidPrev) {
    	/*  DISPOSE
    	    - 0 : no change
    		- 1 : clear to transparent
    		- 2 : retstore to content before rendering (previous frame disposed)
    		BLEND
    		- 0 : replace
    		- 1 : blend
    	*/
    	var frms = [];
    	for(var j=0; j<bufs.length; j++) {
    		var cimg = new Uint8Array(bufs[j]), cimg32 = new Uint32Array(cimg.buffer);
    		var nimg;
    		
    		var nx=0, ny=0, nw=w, nh=h, blend=alwaysBlend?1:0;
    		if(j!=0) {
    			var tlim = (forbidPrev || alwaysBlend || j==1 || frms[j-2].dispose!=0)?1:2, tstp = 0, tarea = 1e9;
    			for(var it=0; it<tlim; it++)
    			{
    				var pimg = new Uint8Array(bufs[j-1-it]), p32 = new Uint32Array(bufs[j-1-it]);
    				var mix=w,miy=h,max=-1,may=-1;
    				for(var y=0; y<h; y++) for(var x=0; x<w; x++) {
    					var i = y*w+x;
    					if(cimg32[i]!=p32[i]) {
    						if(x<mix) mix=x;  if(x>max) max=x;
    						if(y<miy) miy=y;  if(y>may) may=y;
    					}
    				}
    				if(max==-1) mix=miy=max=may=0;
    				if(evenCrd) {  if((mix&1)==1)mix--;  if((miy&1)==1)miy--;  }
    				var sarea = (max-mix+1)*(may-miy+1);
    				if(sarea<tarea) {
    					tarea = sarea;  tstp = it;
    					nx = mix; ny = miy; nw = max-mix+1; nh = may-miy+1;
    				}
    			}
    			
    			// alwaysBlend: pokud zjistím, že blendit nelze, nastavím předchozímu snímku dispose=1. Zajistím, aby obsahoval můj obdélník.
    			var pimg = new Uint8Array(bufs[j-1-tstp]);
    			if(tstp==1) frms[j-1].dispose = 2;
    			
    			nimg = new Uint8Array(nw*nh*4);
    			UPNG._copyTile(pimg,w,h, nimg,nw,nh, -nx,-ny, 0);
    			
    			blend =  UPNG._copyTile(cimg,w,h, nimg,nw,nh, -nx,-ny, 3) ? 1 : 0;
    			if(blend==1) UPNG.encode._prepareDiff(cimg,w,h,nimg,{x:nx,y:ny,width:nw,height:nh});
    			else         UPNG._copyTile(cimg,w,h, nimg,nw,nh, -nx,-ny, 0);
    			//UPNG._copyTile(cimg,w,h, nimg,nw,nh, -nx,-ny, blend==1?2:0);
    		}
    		else nimg = cimg.slice(0);	// img may be rewritten further ... don't rewrite input
    		
    		frms.push({rect:{x:nx,y:ny,width:nw,height:nh}, img:nimg, blend:blend, dispose:0});
    	}
    	
    	
    	if(alwaysBlend) for(var j=0; j<frms.length; j++) {
    		var frm = frms[j];  if(frm.blend==1) continue;
    		var r0 = frm.rect, r1 = frms[j-1].rect;
    		var miX = Math.min(r0.x, r1.x), miY = Math.min(r0.y, r1.y);
    		var maX = Math.max(r0.x+r0.width, r1.x+r1.width), maY = Math.max(r0.y+r0.height, r1.y+r1.height);
    		var r = {x:miX, y:miY, width:maX-miX, height:maY-miY};
    		
    		frms[j-1].dispose = 1;
    		if(j-1!=0) 
    		UPNG.encode._updateFrame(bufs, w,h,frms, j-1,r, evenCrd);
    		UPNG.encode._updateFrame(bufs, w,h,frms, j  ,r, evenCrd);
    	}
    	var area = 0;
    	if(bufs.length!=1) for(var i=0; i<frms.length; i++) {
    		var frm = frms[i];
    		area += frm.rect.width*frm.rect.height;
    		//if(i==0 || frm.blend!=1) continue;
    		//var ob = new Uint8Array(
    		//console.log(frm.blend, frm.dispose, frm.rect);
    	}
    	//if(area!=0) console.log(area);
    	return frms;
    };
    UPNG.encode._updateFrame = function(bufs, w,h, frms, i, r, evenCrd) {
    	var U8 = Uint8Array, U32 = Uint32Array;
    	var pimg = new U8(bufs[i-1]), pimg32 = new U32(bufs[i-1]), nimg = i+1<bufs.length ? new U8(bufs[i+1]):null;
    	var cimg = new U8(bufs[i]), cimg32 = new U32(cimg.buffer);
    	
    	var mix=w,miy=h,max=-1,may=-1;
    	for(var y=0; y<r.height; y++) for(var x=0; x<r.width; x++) {
    		var cx = r.x+x, cy = r.y+y;
    		var j = cy*w+cx, cc = cimg32[j];
    		// no need to draw transparency, or to dispose it. Or, if writing the same color and the next one does not need transparency.
    		if(cc==0 || (frms[i-1].dispose==0 && pimg32[j]==cc && (nimg==null || nimg[j*4+3]!=0))/**/) ;
    		else {
    			if(cx<mix) mix=cx;  if(cx>max) max=cx;
    			if(cy<miy) miy=cy;  if(cy>may) may=cy;
    		}
    	}
    	if(max==-1) mix=miy=max=may=0;
    	if(evenCrd) {  if((mix&1)==1)mix--;  if((miy&1)==1)miy--;  }
    	r = {x:mix, y:miy, width:max-mix+1, height:may-miy+1};
    	
    	var fr = frms[i];  fr.rect = r;  fr.blend = 1;  fr.img = new Uint8Array(r.width*r.height*4);
    	if(frms[i-1].dispose==0) {
    		UPNG._copyTile(pimg,w,h, fr.img,r.width,r.height, -r.x,-r.y, 0);
    		UPNG.encode._prepareDiff(cimg,w,h,fr.img,r);
    		//UPNG._copyTile(cimg,w,h, fr.img,r.width,r.height, -r.x,-r.y, 2);
    	}
    	else
    		UPNG._copyTile(cimg,w,h, fr.img,r.width,r.height, -r.x,-r.y, 0);
    };
    UPNG.encode._prepareDiff = function(cimg, w,h, nimg, rec) {
    	UPNG._copyTile(cimg,w,h, nimg,rec.width,rec.height, -rec.x,-rec.y, 2);
    	/*
    	var n32 = new Uint32Array(nimg.buffer);
    	var og = new Uint8Array(rec.width*rec.height*4), o32 = new Uint32Array(og.buffer);
    	UPNG._copyTile(cimg,w,h, og,rec.width,rec.height, -rec.x,-rec.y, 0);
    	for(var i=4; i<nimg.length; i+=4) {
    		if(nimg[i-1]!=0 && nimg[i+3]==0 && o32[i>>>2]==o32[(i>>>2)-1]) {
    			n32[i>>>2]=o32[i>>>2];
    			//var j = i, c=p32[(i>>>2)-1];
    			//while(p32[j>>>2]==c) {  n32[j>>>2]=c;  j+=4;  }
    		}
    	}
    	for(var i=nimg.length-8; i>0; i-=4) {
    		if(nimg[i+7]!=0 && nimg[i+3]==0 && o32[i>>>2]==o32[(i>>>2)+1]) {
    			n32[i>>>2]=o32[i>>>2];
    			//var j = i, c=p32[(i>>>2)-1];
    			//while(p32[j>>>2]==c) {  n32[j>>>2]=c;  j+=4;  }
    		}
    	}*/
    };

    UPNG.encode._filterZero = function(img,h,bpp,bpl,data, filter, levelZero)
    {
    	var fls = [], ftry=[0,1,2,3,4];
    	if     (filter!=-1)             ftry=[filter];
    	else if(h*bpl>500000 || bpp==1) ftry=[0];
    	var opts;  if(levelZero) opts={level:0};
    	
    	var CMPR = (levelZero && UZIP!=null) ? UZIP : pako_1;
    	
    	for(var i=0; i<ftry.length; i++) {
    		for(var y=0; y<h; y++) UPNG.encode._filterLine(data, img, y, bpl, bpp, ftry[i]);
    		//var nimg = new Uint8Array(data.length);
    		//var sz = UZIP.F.deflate(data, nimg);  fls.push(nimg.slice(0,sz));
    		//var dfl = pako["deflate"](data), dl=dfl.length-4;
    		//var crc = (dfl[dl+3]<<24)|(dfl[dl+2]<<16)|(dfl[dl+1]<<8)|(dfl[dl+0]<<0);
    		//console.log(crc, UZIP.adler(data,2,data.length-6));
    		fls.push(CMPR["deflate"](data,opts));
    	}
    	var ti, tsize=1e9;
    	for(var i=0; i<fls.length; i++) if(fls[i].length<tsize) {  ti=i;  tsize=fls[i].length;  }
    	return fls[ti];
    };
    UPNG.encode._filterLine = function(data, img, y, bpl, bpp, type)
    {
    	var i = y*bpl, di = i+y, paeth = UPNG.decode._paeth;
    	data[di]=type;  di++;

    	if(type==0) {
    		if(bpl<500) for(var x=0; x<bpl; x++) data[di+x] = img[i+x];
    		else data.set(new Uint8Array(img.buffer,i,bpl),di);
    	}
    	else if(type==1) {
    		for(var x=  0; x<bpp; x++) data[di+x] =  img[i+x];
    		for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]-img[i+x-bpp]+256)&255;
    	}
    	else if(y==0) {
    		for(var x=  0; x<bpp; x++) data[di+x] = img[i+x];

    		if(type==2) for(var x=bpp; x<bpl; x++) data[di+x] = img[i+x];
    		if(type==3) for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x] - (img[i+x-bpp]>>1) +256)&255;
    		if(type==4) for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x] - paeth(img[i+x-bpp], 0, 0) +256)&255;
    	}
    	else {
    		if(type==2) { for(var x=  0; x<bpl; x++) data[di+x] = (img[i+x]+256 - img[i+x-bpl])&255;  }
    		if(type==3) { for(var x=  0; x<bpp; x++) data[di+x] = (img[i+x]+256 - (img[i+x-bpl]>>1))&255;
    					  for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]+256 - ((img[i+x-bpl]+img[i+x-bpp])>>1))&255;  }
    		if(type==4) { for(var x=  0; x<bpp; x++) data[di+x] = (img[i+x]+256 - paeth(0, img[i+x-bpl], 0))&255;
    					  for(var x=bpp; x<bpl; x++) data[di+x] = (img[i+x]+256 - paeth(img[i+x-bpp], img[i+x-bpl], img[i+x-bpp-bpl]))&255;  }
    	}
    };

    UPNG.crc = {
    	table : ( function() {
    	   var tab = new Uint32Array(256);
    	   for (var n=0; n<256; n++) {
    			var c = n;
    			for (var k=0; k<8; k++) {
    				if (c & 1)  c = 0xedb88320 ^ (c >>> 1);
    				else        c = c >>> 1;
    			}
    			tab[n] = c;  }
    		return tab;  })(),
    	update : function(c, buf, off, len) {
    		for (var i=0; i<len; i++)  c = UPNG.crc.table[(c ^ buf[off+i]) & 0xff] ^ (c >>> 8);
    		return c;
    	},
    	crc : function(b,o,l)  {  return UPNG.crc.update(0xffffffff,b,o,l) ^ 0xffffffff;  }
    };


    UPNG.quantize = function(abuf, ps)
    {	
    	var oimg = new Uint8Array(abuf), nimg = oimg.slice(0), nimg32 = new Uint32Array(nimg.buffer);
    	
    	var KD = UPNG.quantize.getKDtree(nimg, ps);
    	var root = KD[0], leafs = KD[1];
    	
    	var planeDst = UPNG.quantize.planeDst;
    	var sb = oimg, tb = nimg32, len=sb.length;
    		
    	var inds = new Uint8Array(oimg.length>>2);
    	for(var i=0; i<len; i+=4) {
    		var r=sb[i]*(1/255), g=sb[i+1]*(1/255), b=sb[i+2]*(1/255), a=sb[i+3]*(1/255);
    		
    		//  exact, but too slow :(
    		var nd = UPNG.quantize.getNearest(root, r, g, b, a);
    		//var nd = root;
    		//while(nd.left) nd = (planeDst(nd.est,r,g,b,a)<=0) ? nd.left : nd.right;
    		
    		inds[i>>2] = nd.ind;
    		tb[i>>2] = nd.est.rgba;
    	}
    	return {  abuf:nimg.buffer, inds:inds, plte:leafs  };
    };

    UPNG.quantize.getKDtree = function(nimg, ps, err) {
    	if(err==null) err = 0.0001;
    	var nimg32 = new Uint32Array(nimg.buffer);
    	
    	var root = {i0:0, i1:nimg.length, bst:null, est:null, tdst:0, left:null, right:null };  // basic statistic, extra statistic
    	root.bst = UPNG.quantize.stats(  nimg,root.i0, root.i1  );  root.est = UPNG.quantize.estats( root.bst );
    	var leafs = [root];
    	
    	while(leafs.length<ps)
    	{
    		var maxL = 0, mi=0;
    		for(var i=0; i<leafs.length; i++) if(leafs[i].est.L > maxL) {  maxL=leafs[i].est.L;  mi=i;  }
    		if(maxL<err) break;
    		var node = leafs[mi];
    		
    		var s0 = UPNG.quantize.splitPixels(nimg,nimg32, node.i0, node.i1, node.est.e, node.est.eMq255);
    		var s0wrong = (node.i0>=s0 || node.i1<=s0);
    		//console.log(maxL, leafs.length, mi);
    		if(s0wrong) {  node.est.L=0;  continue;  }
    		
    		
    		var ln = {i0:node.i0, i1:s0, bst:null, est:null, tdst:0, left:null, right:null };  ln.bst = UPNG.quantize.stats( nimg, ln.i0, ln.i1 );  
    		ln.est = UPNG.quantize.estats( ln.bst );
    		var rn = {i0:s0, i1:node.i1, bst:null, est:null, tdst:0, left:null, right:null };  rn.bst = {R:[], m:[], N:node.bst.N-ln.bst.N};
    		for(var i=0; i<16; i++) rn.bst.R[i] = node.bst.R[i]-ln.bst.R[i];
    		for(var i=0; i< 4; i++) rn.bst.m[i] = node.bst.m[i]-ln.bst.m[i];
    		rn.est = UPNG.quantize.estats( rn.bst );
    		
    		node.left = ln;  node.right = rn;
    		leafs[mi]=ln;  leafs.push(rn);
    	}
    	leafs.sort(function(a,b) {  return b.bst.N-a.bst.N;  });
    	for(var i=0; i<leafs.length; i++) leafs[i].ind=i;
    	return [root, leafs];
    };

    UPNG.quantize.getNearest = function(nd, r,g,b,a)
    {
    	if(nd.left==null) {  nd.tdst = UPNG.quantize.dist(nd.est.q,r,g,b,a);  return nd;  }
    	var planeDst = UPNG.quantize.planeDst(nd.est,r,g,b,a);
    	
    	var node0 = nd.left, node1 = nd.right;
    	if(planeDst>0) {  node0=nd.right;  node1=nd.left;  }
    	
    	var ln = UPNG.quantize.getNearest(node0, r,g,b,a);
    	if(ln.tdst<=planeDst*planeDst) return ln;
    	var rn = UPNG.quantize.getNearest(node1, r,g,b,a);
    	return rn.tdst<ln.tdst ? rn : ln;
    };
    UPNG.quantize.planeDst = function(est, r,g,b,a) {  var e = est.e;  return e[0]*r + e[1]*g + e[2]*b + e[3]*a - est.eMq;  };
    UPNG.quantize.dist     = function(q,   r,g,b,a) {  var d0=r-q[0], d1=g-q[1], d2=b-q[2], d3=a-q[3];  return d0*d0+d1*d1+d2*d2+d3*d3;  };

    UPNG.quantize.splitPixels = function(nimg, nimg32, i0, i1, e, eMq)
    {
    	var vecDot = UPNG.quantize.vecDot;
    	i1-=4;
    	while(i0<i1)
    	{
    		while(vecDot(nimg, i0, e)<=eMq) i0+=4;
    		while(vecDot(nimg, i1, e)> eMq) i1-=4;
    		if(i0>=i1) break;
    		
    		var t = nimg32[i0>>2];  nimg32[i0>>2] = nimg32[i1>>2];  nimg32[i1>>2]=t;
    		
    		i0+=4;  i1-=4;
    	}
    	while(vecDot(nimg, i0, e)>eMq) i0-=4;
    	return i0+4;
    };
    UPNG.quantize.vecDot = function(nimg, i, e)
    {
    	return nimg[i]*e[0] + nimg[i+1]*e[1] + nimg[i+2]*e[2] + nimg[i+3]*e[3];
    };
    UPNG.quantize.stats = function(nimg, i0, i1){
    	var R = [0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0];
    	var m = [0,0,0,0];
    	var N = (i1-i0)>>2;
    	for(var i=i0; i<i1; i+=4)
    	{
    		var r = nimg[i]*(1/255), g = nimg[i+1]*(1/255), b = nimg[i+2]*(1/255), a = nimg[i+3]*(1/255);
    		//var r = nimg[i], g = nimg[i+1], b = nimg[i+2], a = nimg[i+3];
    		m[0]+=r;  m[1]+=g;  m[2]+=b;  m[3]+=a;
    		
    		R[ 0] += r*r;  R[ 1] += r*g;  R[ 2] += r*b;  R[ 3] += r*a;  
    		               R[ 5] += g*g;  R[ 6] += g*b;  R[ 7] += g*a; 
    		                              R[10] += b*b;  R[11] += b*a;  
    		                                             R[15] += a*a;  
    	}
    	R[4]=R[1];  R[8]=R[2];  R[9]=R[6];  R[12]=R[3];  R[13]=R[7];  R[14]=R[11];
    	
    	return {R:R, m:m, N:N};
    };
    UPNG.quantize.estats = function(stats){
    	var R = stats.R, m = stats.m, N = stats.N;
    	
    	// when all samples are equal, but N is large (millions), the Rj can be non-zero ( 0.0003.... - precission error)
    	var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], iN = (N==0 ? 0 : 1/N);
    	var Rj = [
    		R[ 0] - m0*m0*iN,  R[ 1] - m0*m1*iN,  R[ 2] - m0*m2*iN,  R[ 3] - m0*m3*iN,  
    		R[ 4] - m1*m0*iN,  R[ 5] - m1*m1*iN,  R[ 6] - m1*m2*iN,  R[ 7] - m1*m3*iN,
    		R[ 8] - m2*m0*iN,  R[ 9] - m2*m1*iN,  R[10] - m2*m2*iN,  R[11] - m2*m3*iN,  
    		R[12] - m3*m0*iN,  R[13] - m3*m1*iN,  R[14] - m3*m2*iN,  R[15] - m3*m3*iN 
    	];
    	
    	var A = Rj, M = UPNG.M4;
    	var b = [0.5,0.5,0.5,0.5], mi = 0, tmi = 0;
    	
    	if(N!=0)
    	for(var i=0; i<10; i++) {
    		b = M.multVec(A, b);  tmi = Math.sqrt(M.dot(b,b));  b = M.sml(1/tmi,  b);
    		if(Math.abs(tmi-mi)<1e-9) break;  mi = tmi;
    	}	
    	//b = [0,0,1,0];  mi=N;
    	var q = [m0*iN, m1*iN, m2*iN, m3*iN];
    	var eMq255 = M.dot(M.sml(255,q),b);
    	
    	return {  Cov:Rj, q:q, e:b, L:mi,  eMq255:eMq255, eMq : M.dot(b,q),
    				rgba: (((Math.round(255*q[3])<<24) | (Math.round(255*q[2])<<16) |  (Math.round(255*q[1])<<8) | (Math.round(255*q[0])<<0))>>>0)  };
    };
    UPNG.M4 = {
    	multVec : function(m,v) {
    			return [
    				m[ 0]*v[0] + m[ 1]*v[1] + m[ 2]*v[2] + m[ 3]*v[3],
    				m[ 4]*v[0] + m[ 5]*v[1] + m[ 6]*v[2] + m[ 7]*v[3],
    				m[ 8]*v[0] + m[ 9]*v[1] + m[10]*v[2] + m[11]*v[3],
    				m[12]*v[0] + m[13]*v[1] + m[14]*v[2] + m[15]*v[3]
    			];
    	},
    	dot : function(x,y) {  return  x[0]*y[0]+x[1]*y[1]+x[2]*y[2]+x[3]*y[3];  },
    	sml : function(a,y) {  return [a*y[0],a*y[1],a*y[2],a*y[3]];  }
    };

    UPNG.encode.concatRGBA = function(bufs) {
    	var tlen = 0;
    	for(var i=0; i<bufs.length; i++) tlen += bufs[i].byteLength;
    	var nimg = new Uint8Array(tlen), noff=0;
    	for(var i=0; i<bufs.length; i++) {
    		var img = new Uint8Array(bufs[i]), il = img.length;
    		for(var j=0; j<il; j+=4) {  
    			var r=img[j], g=img[j+1], b=img[j+2], a = img[j+3];
    			if(a==0) r=g=b=0;
    			nimg[noff+j]=r;  nimg[noff+j+1]=g;  nimg[noff+j+2]=b;  nimg[noff+j+3]=a;  }
    		noff += il;
    	}
    	return nimg.buffer;
    };

    var getImageType = function (ctype) {
        if (ctype === 0)
            return PngType.Greyscale;
        if (ctype === 2)
            return PngType.Truecolour;
        if (ctype === 3)
            return PngType.IndexedColour;
        if (ctype === 4)
            return PngType.GreyscaleWithAlpha;
        if (ctype === 6)
            return PngType.TruecolourWithAlpha;
        throw new Error("Unknown color type: " + ctype);
    };
    var splitAlphaChannel = function (rgbaChannel) {
        var pixelCount = Math.floor(rgbaChannel.length / 4);
        var rgbChannel = new Uint8Array(pixelCount * 3);
        var alphaChannel = new Uint8Array(pixelCount * 1);
        var rgbaOffset = 0;
        var rgbOffset = 0;
        var alphaOffset = 0;
        while (rgbaOffset < rgbaChannel.length) {
            rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
            rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
            rgbChannel[rgbOffset++] = rgbaChannel[rgbaOffset++];
            alphaChannel[alphaOffset++] = rgbaChannel[rgbaOffset++];
        }
        return { rgbChannel: rgbChannel, alphaChannel: alphaChannel };
    };
    var PngType;
    (function (PngType) {
        PngType["Greyscale"] = "Greyscale";
        PngType["Truecolour"] = "Truecolour";
        PngType["IndexedColour"] = "IndexedColour";
        PngType["GreyscaleWithAlpha"] = "GreyscaleWithAlpha";
        PngType["TruecolourWithAlpha"] = "TruecolourWithAlpha";
    })(PngType || (PngType = {}));
    var PNG = /** @class */ (function () {
        function PNG(pngData) {
            var upng = UPNG.decode(pngData);
            var frames = UPNG.toRGBA8(upng);
            if (frames.length > 1)
                throw new Error("Animated PNGs are not supported");
            var frame = new Uint8Array(frames[0]);
            var _a = splitAlphaChannel(frame), rgbChannel = _a.rgbChannel, alphaChannel = _a.alphaChannel;
            this.rgbChannel = rgbChannel;
            var hasAlphaValues = alphaChannel.some(function (a) { return a < 1; });
            if (hasAlphaValues)
                this.alphaChannel = alphaChannel;
            this.type = getImageType(upng.ctype);
            this.width = upng.width;
            this.height = upng.height;
            this.bitsPerComponent = 8;
        }
        PNG.load = function (pngData) { return new PNG(pngData); };
        return PNG;
    }());
    //# sourceMappingURL=png.js.map

    /**
     * A note of thanks to the developers of https://github.com/foliojs/pdfkit, as
     * this class borrows from:
     *   https://github.com/devongovett/pdfkit/blob/e71edab0dd4657b5a767804ba86c94c58d01fbca/lib/image/png.coffee
     */
    var PngEmbedder = /** @class */ (function () {
        function PngEmbedder(png) {
            this.image = png;
            this.bitsPerComponent = png.bitsPerComponent;
            this.width = png.width;
            this.height = png.height;
            this.colorSpace = 'DeviceRGB';
        }
        PngEmbedder.for = function (imageData) {
            return __awaiter(this, void 0, void 0, function () {
                var png;
                return __generator(this, function (_a) {
                    png = PNG.load(imageData);
                    return [2 /*return*/, new PngEmbedder(png)];
                });
            });
        };
        PngEmbedder.prototype.embedIntoContext = function (context, ref) {
            return __awaiter(this, void 0, void 0, function () {
                var SMask, xObject;
                return __generator(this, function (_a) {
                    SMask = this.embedAlphaChannel(context);
                    xObject = context.flateStream(this.image.rgbChannel, {
                        Type: 'XObject',
                        Subtype: 'Image',
                        BitsPerComponent: this.image.bitsPerComponent,
                        Width: this.image.width,
                        Height: this.image.height,
                        ColorSpace: this.colorSpace,
                        SMask: SMask,
                    });
                    if (ref) {
                        context.assign(ref, xObject);
                        return [2 /*return*/, ref];
                    }
                    else {
                        return [2 /*return*/, context.register(xObject)];
                    }
                });
            });
        };
        PngEmbedder.prototype.embedAlphaChannel = function (context) {
            if (!this.image.alphaChannel)
                return undefined;
            var xObject = context.flateStream(this.image.alphaChannel, {
                Type: 'XObject',
                Subtype: 'Image',
                Height: this.image.height,
                Width: this.image.width,
                BitsPerComponent: this.image.bitsPerComponent,
                ColorSpace: 'DeviceGray',
                Decode: [0, 1],
            });
            return context.register(xObject);
        };
        return PngEmbedder;
    }());
    //# sourceMappingURL=PngEmbedder.js.map

    /*
     * Copyright 2012 Mozilla Foundation
     *
     * The Stream class contained in this file is a TypeScript port of the
     * JavaScript Stream class in Mozilla's pdf.js project, made available
     * under the Apache 2.0 open source license.
     */
    var Stream = /** @class */ (function () {
        function Stream(buffer, start, length) {
            this.bytes = buffer;
            this.start = start || 0;
            this.pos = this.start;
            this.end = !!start && !!length ? start + length : this.bytes.length;
        }
        Object.defineProperty(Stream.prototype, "length", {
            get: function () {
                return this.end - this.start;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Stream.prototype, "isEmpty", {
            get: function () {
                return this.length === 0;
            },
            enumerable: true,
            configurable: true
        });
        Stream.prototype.getByte = function () {
            if (this.pos >= this.end) {
                return -1;
            }
            return this.bytes[this.pos++];
        };
        Stream.prototype.getUint16 = function () {
            var b0 = this.getByte();
            var b1 = this.getByte();
            if (b0 === -1 || b1 === -1) {
                return -1;
            }
            return (b0 << 8) + b1;
        };
        Stream.prototype.getInt32 = function () {
            var b0 = this.getByte();
            var b1 = this.getByte();
            var b2 = this.getByte();
            var b3 = this.getByte();
            return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
        };
        // Returns subarray of original buffer, should only be read.
        Stream.prototype.getBytes = function (length, forceClamped) {
            if (forceClamped === void 0) { forceClamped = false; }
            var bytes = this.bytes;
            var pos = this.pos;
            var strEnd = this.end;
            if (!length) {
                var subarray = bytes.subarray(pos, strEnd);
                // `this.bytes` is always a `Uint8Array` here.
                return forceClamped ? new Uint8ClampedArray(subarray) : subarray;
            }
            else {
                var end = pos + length;
                if (end > strEnd) {
                    end = strEnd;
                }
                this.pos = end;
                var subarray = bytes.subarray(pos, end);
                // `this.bytes` is always a `Uint8Array` here.
                return forceClamped ? new Uint8ClampedArray(subarray) : subarray;
            }
        };
        Stream.prototype.peekByte = function () {
            var peekedByte = this.getByte();
            this.pos--;
            return peekedByte;
        };
        Stream.prototype.peekBytes = function (length, forceClamped) {
            if (forceClamped === void 0) { forceClamped = false; }
            var bytes = this.getBytes(length, forceClamped);
            this.pos -= bytes.length;
            return bytes;
        };
        Stream.prototype.skip = function (n) {
            if (!n) {
                n = 1;
            }
            this.pos += n;
        };
        Stream.prototype.reset = function () {
            this.pos = this.start;
        };
        Stream.prototype.moveStart = function () {
            this.start = this.pos;
        };
        Stream.prototype.makeSubStream = function (start, length) {
            return new Stream(this.bytes, start, length);
        };
        Stream.prototype.decode = function () {
            return this.bytes;
        };
        return Stream;
    }());
    //# sourceMappingURL=Stream.js.map

    /*
     * Copyright 2012 Mozilla Foundation
     *
     * The DecodeStream class contained in this file is a TypeScript port of the
     * JavaScript DecodeStream class in Mozilla's pdf.js project, made available
     * under the Apache 2.0 open source license.
     */
    // Lots of DecodeStreams are created whose buffers are never used.  For these
    // we share a single empty buffer. This is (a) space-efficient and (b) avoids
    // having special cases that would be required if we used |null| for an empty
    // buffer.
    var emptyBuffer = new Uint8Array(0);
    /**
     * Super class for the decoding streams
     */
    var DecodeStream = /** @class */ (function () {
        function DecodeStream(maybeMinBufferLength) {
            this.pos = 0;
            this.bufferLength = 0;
            this.eof = false;
            this.buffer = emptyBuffer;
            this.minBufferLength = 512;
            if (maybeMinBufferLength) {
                // Compute the first power of two that is as big as maybeMinBufferLength.
                while (this.minBufferLength < maybeMinBufferLength) {
                    this.minBufferLength *= 2;
                }
            }
        }
        Object.defineProperty(DecodeStream.prototype, "isEmpty", {
            get: function () {
                while (!this.eof && this.bufferLength === 0) {
                    this.readBlock();
                }
                return this.bufferLength === 0;
            },
            enumerable: true,
            configurable: true
        });
        DecodeStream.prototype.getByte = function () {
            var pos = this.pos;
            while (this.bufferLength <= pos) {
                if (this.eof) {
                    return -1;
                }
                this.readBlock();
            }
            return this.buffer[this.pos++];
        };
        DecodeStream.prototype.getUint16 = function () {
            var b0 = this.getByte();
            var b1 = this.getByte();
            if (b0 === -1 || b1 === -1) {
                return -1;
            }
            return (b0 << 8) + b1;
        };
        DecodeStream.prototype.getInt32 = function () {
            var b0 = this.getByte();
            var b1 = this.getByte();
            var b2 = this.getByte();
            var b3 = this.getByte();
            return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
        };
        DecodeStream.prototype.getBytes = function (length, forceClamped) {
            if (forceClamped === void 0) { forceClamped = false; }
            var end;
            var pos = this.pos;
            if (length) {
                this.ensureBuffer(pos + length);
                end = pos + length;
                while (!this.eof && this.bufferLength < end) {
                    this.readBlock();
                }
                var bufEnd = this.bufferLength;
                if (end > bufEnd) {
                    end = bufEnd;
                }
            }
            else {
                while (!this.eof) {
                    this.readBlock();
                }
                end = this.bufferLength;
            }
            this.pos = end;
            var subarray = this.buffer.subarray(pos, end);
            // `this.buffer` is either a `Uint8Array` or `Uint8ClampedArray` here.
            return forceClamped && !(subarray instanceof Uint8ClampedArray)
                ? new Uint8ClampedArray(subarray)
                : subarray;
        };
        DecodeStream.prototype.peekByte = function () {
            var peekedByte = this.getByte();
            this.pos--;
            return peekedByte;
        };
        DecodeStream.prototype.peekBytes = function (length, forceClamped) {
            if (forceClamped === void 0) { forceClamped = false; }
            var bytes = this.getBytes(length, forceClamped);
            this.pos -= bytes.length;
            return bytes;
        };
        DecodeStream.prototype.skip = function (n) {
            if (!n) {
                n = 1;
            }
            this.pos += n;
        };
        DecodeStream.prototype.reset = function () {
            this.pos = 0;
        };
        DecodeStream.prototype.makeSubStream = function (start, length /* dict */) {
            var end = start + length;
            while (this.bufferLength <= end && !this.eof) {
                this.readBlock();
            }
            return new Stream(this.buffer, start, length /* dict */);
        };
        DecodeStream.prototype.decode = function () {
            while (!this.eof)
                this.readBlock();
            return this.buffer.subarray(0, this.bufferLength);
        };
        DecodeStream.prototype.readBlock = function () {
            throw new MethodNotImplementedError(this.constructor.name, 'readBlock');
        };
        DecodeStream.prototype.ensureBuffer = function (requested) {
            var buffer = this.buffer;
            if (requested <= buffer.byteLength) {
                return buffer;
            }
            var size = this.minBufferLength;
            while (size < requested) {
                size *= 2;
            }
            var buffer2 = new Uint8Array(size);
            buffer2.set(buffer);
            return (this.buffer = buffer2);
        };
        return DecodeStream;
    }());
    //# sourceMappingURL=DecodeStream.js.map

    /*
     * Copyright 2012 Mozilla Foundation
     *
     * The Ascii85Stream class contained in this file is a TypeScript port of the
     * JavaScript Ascii85Stream class in Mozilla's pdf.js project, made available
     * under the Apache 2.0 open source license.
     */
    var isSpace = function (ch) {
        return ch === 0x20 || ch === 0x09 || ch === 0x0d || ch === 0x0a;
    };
    var Ascii85Stream = /** @class */ (function (_super) {
        __extends(Ascii85Stream, _super);
        function Ascii85Stream(stream, maybeLength) {
            var _this = _super.call(this, maybeLength) || this;
            _this.stream = stream;
            _this.input = new Uint8Array(5);
            // Most streams increase in size when decoded, but Ascii85 streams
            // typically shrink by ~20%.
            if (maybeLength) {
                maybeLength = 0.8 * maybeLength;
            }
            return _this;
        }
        Ascii85Stream.prototype.readBlock = function () {
            var TILDA_CHAR = 0x7e; // '~'
            var Z_LOWER_CHAR = 0x7a; // 'z'
            var EOF = -1;
            var stream = this.stream;
            var c = stream.getByte();
            while (isSpace(c)) {
                c = stream.getByte();
            }
            if (c === EOF || c === TILDA_CHAR) {
                this.eof = true;
                return;
            }
            var bufferLength = this.bufferLength;
            var buffer;
            var i;
            // special code for z
            if (c === Z_LOWER_CHAR) {
                buffer = this.ensureBuffer(bufferLength + 4);
                for (i = 0; i < 4; ++i) {
                    buffer[bufferLength + i] = 0;
                }
                this.bufferLength += 4;
            }
            else {
                var input = this.input;
                input[0] = c;
                for (i = 1; i < 5; ++i) {
                    c = stream.getByte();
                    while (isSpace(c)) {
                        c = stream.getByte();
                    }
                    input[i] = c;
                    if (c === EOF || c === TILDA_CHAR) {
                        break;
                    }
                }
                buffer = this.ensureBuffer(bufferLength + i - 1);
                this.bufferLength += i - 1;
                // partial ending;
                if (i < 5) {
                    for (; i < 5; ++i) {
                        input[i] = 0x21 + 84;
                    }
                    this.eof = true;
                }
                var t = 0;
                for (i = 0; i < 5; ++i) {
                    t = t * 85 + (input[i] - 0x21);
                }
                for (i = 3; i >= 0; --i) {
                    buffer[bufferLength + i] = t & 0xff;
                    t >>= 8;
                }
            }
        };
        return Ascii85Stream;
    }(DecodeStream));
    //# sourceMappingURL=Ascii85Stream.js.map

    /*
     * Copyright 2012 Mozilla Foundation
     *
     * The AsciiHexStream class contained in this file is a TypeScript port of the
     * JavaScript AsciiHexStream class in Mozilla's pdf.js project, made available
     * under the Apache 2.0 open source license.
     */
    var AsciiHexStream = /** @class */ (function (_super) {
        __extends(AsciiHexStream, _super);
        function AsciiHexStream(stream, maybeLength) {
            var _this = _super.call(this, maybeLength) || this;
            _this.stream = stream;
            _this.firstDigit = -1;
            // Most streams increase in size when decoded, but AsciiHex streams shrink
            // by 50%.
            if (maybeLength) {
                maybeLength = 0.5 * maybeLength;
            }
            return _this;
        }
        AsciiHexStream.prototype.readBlock = function () {
            var UPSTREAM_BLOCK_SIZE = 8000;
            var bytes = this.stream.getBytes(UPSTREAM_BLOCK_SIZE);
            if (!bytes.length) {
                this.eof = true;
                return;
            }
            var maxDecodeLength = (bytes.length + 1) >> 1;
            var buffer = this.ensureBuffer(this.bufferLength + maxDecodeLength);
            var bufferLength = this.bufferLength;
            var firstDigit = this.firstDigit;
            for (var i = 0, ii = bytes.length; i < ii; i++) {
                var ch = bytes[i];
                var digit = void 0;
                if (ch >= 0x30 && ch <= 0x39) {
                    // '0'-'9'
                    digit = ch & 0x0f;
                }
                else if ((ch >= 0x41 && ch <= 0x46) || (ch >= 0x61 && ch <= 0x66)) {
                    // 'A'-'Z', 'a'-'z'
                    digit = (ch & 0x0f) + 9;
                }
                else if (ch === 0x3e) {
                    // '>'
                    this.eof = true;
                    break;
                }
                else {
                    // probably whitespace
                    continue; // ignoring
                }
                if (firstDigit < 0) {
                    firstDigit = digit;
                }
                else {
                    buffer[bufferLength++] = (firstDigit << 4) | digit;
                    firstDigit = -1;
                }
            }
            if (firstDigit >= 0 && this.eof) {
                // incomplete byte
                buffer[bufferLength++] = firstDigit << 4;
                firstDigit = -1;
            }
            this.firstDigit = firstDigit;
            this.bufferLength = bufferLength;
        };
        return AsciiHexStream;
    }(DecodeStream));
    //# sourceMappingURL=AsciiHexStream.js.map

    /*
     * Copyright 1996-2003 Glyph & Cog, LLC
     *
     * The flate stream implementation contained in this file is a JavaScript port
     * of XPDF's implementation, made available under the Apache 2.0 open source
     * license.
     */
    // prettier-ignore
    var codeLenCodeMap = new Int32Array([
        16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
    ]);
    // prettier-ignore
    var lengthDecode = new Int32Array([
        0x00003, 0x00004, 0x00005, 0x00006, 0x00007, 0x00008, 0x00009, 0x0000a,
        0x1000b, 0x1000d, 0x1000f, 0x10011, 0x20013, 0x20017, 0x2001b, 0x2001f,
        0x30023, 0x3002b, 0x30033, 0x3003b, 0x40043, 0x40053, 0x40063, 0x40073,
        0x50083, 0x500a3, 0x500c3, 0x500e3, 0x00102, 0x00102, 0x00102
    ]);
    // prettier-ignore
    var distDecode = new Int32Array([
        0x00001, 0x00002, 0x00003, 0x00004, 0x10005, 0x10007, 0x20009, 0x2000d,
        0x30011, 0x30019, 0x40021, 0x40031, 0x50041, 0x50061, 0x60081, 0x600c1,
        0x70101, 0x70181, 0x80201, 0x80301, 0x90401, 0x90601, 0xa0801, 0xa0c01,
        0xb1001, 0xb1801, 0xc2001, 0xc3001, 0xd4001, 0xd6001
    ]);
    // prettier-ignore
    var fixedLitCodeTab = [new Int32Array([
            0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c0,
            0x70108, 0x80060, 0x80020, 0x900a0, 0x80000, 0x80080, 0x80040, 0x900e0,
            0x70104, 0x80058, 0x80018, 0x90090, 0x70114, 0x80078, 0x80038, 0x900d0,
            0x7010c, 0x80068, 0x80028, 0x900b0, 0x80008, 0x80088, 0x80048, 0x900f0,
            0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c8,
            0x7010a, 0x80064, 0x80024, 0x900a8, 0x80004, 0x80084, 0x80044, 0x900e8,
            0x70106, 0x8005c, 0x8001c, 0x90098, 0x70116, 0x8007c, 0x8003c, 0x900d8,
            0x7010e, 0x8006c, 0x8002c, 0x900b8, 0x8000c, 0x8008c, 0x8004c, 0x900f8,
            0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c4,
            0x70109, 0x80062, 0x80022, 0x900a4, 0x80002, 0x80082, 0x80042, 0x900e4,
            0x70105, 0x8005a, 0x8001a, 0x90094, 0x70115, 0x8007a, 0x8003a, 0x900d4,
            0x7010d, 0x8006a, 0x8002a, 0x900b4, 0x8000a, 0x8008a, 0x8004a, 0x900f4,
            0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cc,
            0x7010b, 0x80066, 0x80026, 0x900ac, 0x80006, 0x80086, 0x80046, 0x900ec,
            0x70107, 0x8005e, 0x8001e, 0x9009c, 0x70117, 0x8007e, 0x8003e, 0x900dc,
            0x7010f, 0x8006e, 0x8002e, 0x900bc, 0x8000e, 0x8008e, 0x8004e, 0x900fc,
            0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c2,
            0x70108, 0x80061, 0x80021, 0x900a2, 0x80001, 0x80081, 0x80041, 0x900e2,
            0x70104, 0x80059, 0x80019, 0x90092, 0x70114, 0x80079, 0x80039, 0x900d2,
            0x7010c, 0x80069, 0x80029, 0x900b2, 0x80009, 0x80089, 0x80049, 0x900f2,
            0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900ca,
            0x7010a, 0x80065, 0x80025, 0x900aa, 0x80005, 0x80085, 0x80045, 0x900ea,
            0x70106, 0x8005d, 0x8001d, 0x9009a, 0x70116, 0x8007d, 0x8003d, 0x900da,
            0x7010e, 0x8006d, 0x8002d, 0x900ba, 0x8000d, 0x8008d, 0x8004d, 0x900fa,
            0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c6,
            0x70109, 0x80063, 0x80023, 0x900a6, 0x80003, 0x80083, 0x80043, 0x900e6,
            0x70105, 0x8005b, 0x8001b, 0x90096, 0x70115, 0x8007b, 0x8003b, 0x900d6,
            0x7010d, 0x8006b, 0x8002b, 0x900b6, 0x8000b, 0x8008b, 0x8004b, 0x900f6,
            0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900ce,
            0x7010b, 0x80067, 0x80027, 0x900ae, 0x80007, 0x80087, 0x80047, 0x900ee,
            0x70107, 0x8005f, 0x8001f, 0x9009e, 0x70117, 0x8007f, 0x8003f, 0x900de,
            0x7010f, 0x8006f, 0x8002f, 0x900be, 0x8000f, 0x8008f, 0x8004f, 0x900fe,
            0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c1,
            0x70108, 0x80060, 0x80020, 0x900a1, 0x80000, 0x80080, 0x80040, 0x900e1,
            0x70104, 0x80058, 0x80018, 0x90091, 0x70114, 0x80078, 0x80038, 0x900d1,
            0x7010c, 0x80068, 0x80028, 0x900b1, 0x80008, 0x80088, 0x80048, 0x900f1,
            0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c9,
            0x7010a, 0x80064, 0x80024, 0x900a9, 0x80004, 0x80084, 0x80044, 0x900e9,
            0x70106, 0x8005c, 0x8001c, 0x90099, 0x70116, 0x8007c, 0x8003c, 0x900d9,
            0x7010e, 0x8006c, 0x8002c, 0x900b9, 0x8000c, 0x8008c, 0x8004c, 0x900f9,
            0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c5,
            0x70109, 0x80062, 0x80022, 0x900a5, 0x80002, 0x80082, 0x80042, 0x900e5,
            0x70105, 0x8005a, 0x8001a, 0x90095, 0x70115, 0x8007a, 0x8003a, 0x900d5,
            0x7010d, 0x8006a, 0x8002a, 0x900b5, 0x8000a, 0x8008a, 0x8004a, 0x900f5,
            0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cd,
            0x7010b, 0x80066, 0x80026, 0x900ad, 0x80006, 0x80086, 0x80046, 0x900ed,
            0x70107, 0x8005e, 0x8001e, 0x9009d, 0x70117, 0x8007e, 0x8003e, 0x900dd,
            0x7010f, 0x8006e, 0x8002e, 0x900bd, 0x8000e, 0x8008e, 0x8004e, 0x900fd,
            0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c3,
            0x70108, 0x80061, 0x80021, 0x900a3, 0x80001, 0x80081, 0x80041, 0x900e3,
            0x70104, 0x80059, 0x80019, 0x90093, 0x70114, 0x80079, 0x80039, 0x900d3,
            0x7010c, 0x80069, 0x80029, 0x900b3, 0x80009, 0x80089, 0x80049, 0x900f3,
            0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900cb,
            0x7010a, 0x80065, 0x80025, 0x900ab, 0x80005, 0x80085, 0x80045, 0x900eb,
            0x70106, 0x8005d, 0x8001d, 0x9009b, 0x70116, 0x8007d, 0x8003d, 0x900db,
            0x7010e, 0x8006d, 0x8002d, 0x900bb, 0x8000d, 0x8008d, 0x8004d, 0x900fb,
            0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c7,
            0x70109, 0x80063, 0x80023, 0x900a7, 0x80003, 0x80083, 0x80043, 0x900e7,
            0x70105, 0x8005b, 0x8001b, 0x90097, 0x70115, 0x8007b, 0x8003b, 0x900d7,
            0x7010d, 0x8006b, 0x8002b, 0x900b7, 0x8000b, 0x8008b, 0x8004b, 0x900f7,
            0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900cf,
            0x7010b, 0x80067, 0x80027, 0x900af, 0x80007, 0x80087, 0x80047, 0x900ef,
            0x70107, 0x8005f, 0x8001f, 0x9009f, 0x70117, 0x8007f, 0x8003f, 0x900df,
            0x7010f, 0x8006f, 0x8002f, 0x900bf, 0x8000f, 0x8008f, 0x8004f, 0x900ff
        ]), 9];
    // prettier-ignore
    var fixedDistCodeTab = [new Int32Array([
            0x50000, 0x50010, 0x50008, 0x50018, 0x50004, 0x50014, 0x5000c, 0x5001c,
            0x50002, 0x50012, 0x5000a, 0x5001a, 0x50006, 0x50016, 0x5000e, 0x00000,
            0x50001, 0x50011, 0x50009, 0x50019, 0x50005, 0x50015, 0x5000d, 0x5001d,
            0x50003, 0x50013, 0x5000b, 0x5001b, 0x50007, 0x50017, 0x5000f, 0x00000
        ]), 5];
    var FlateStream = /** @class */ (function (_super) {
        __extends(FlateStream, _super);
        function FlateStream(stream, maybeLength) {
            var _this = _super.call(this, maybeLength) || this;
            _this.stream = stream;
            var cmf = stream.getByte();
            var flg = stream.getByte();
            if (cmf === -1 || flg === -1) {
                throw new Error("Invalid header in flate stream: " + cmf + ", " + flg);
            }
            if ((cmf & 0x0f) !== 0x08) {
                throw new Error("Unknown compression method in flate stream: " + cmf + ", " + flg);
            }
            if (((cmf << 8) + flg) % 31 !== 0) {
                throw new Error("Bad FCHECK in flate stream: " + cmf + ", " + flg);
            }
            if (flg & 0x20) {
                throw new Error("FDICT bit set in flate stream: " + cmf + ", " + flg);
            }
            _this.codeSize = 0;
            _this.codeBuf = 0;
            return _this;
        }
        FlateStream.prototype.readBlock = function () {
            var buffer;
            var len;
            var str = this.stream;
            // read block header
            var hdr = this.getBits(3);
            if (hdr & 1) {
                this.eof = true;
            }
            hdr >>= 1;
            if (hdr === 0) {
                // uncompressed block
                var b = void 0;
                if ((b = str.getByte()) === -1) {
                    throw new Error('Bad block header in flate stream');
                }
                var blockLen = b;
                if ((b = str.getByte()) === -1) {
                    throw new Error('Bad block header in flate stream');
                }
                blockLen |= b << 8;
                if ((b = str.getByte()) === -1) {
                    throw new Error('Bad block header in flate stream');
                }
                var check = b;
                if ((b = str.getByte()) === -1) {
                    throw new Error('Bad block header in flate stream');
                }
                check |= b << 8;
                if (check !== (~blockLen & 0xffff) && (blockLen !== 0 || check !== 0)) {
                    // Ignoring error for bad "empty" block (see issue 1277)
                    throw new Error('Bad uncompressed block length in flate stream');
                }
                this.codeBuf = 0;
                this.codeSize = 0;
                var bufferLength = this.bufferLength;
                buffer = this.ensureBuffer(bufferLength + blockLen);
                var end = bufferLength + blockLen;
                this.bufferLength = end;
                if (blockLen === 0) {
                    if (str.peekByte() === -1) {
                        this.eof = true;
                    }
                }
                else {
                    for (var n = bufferLength; n < end; ++n) {
                        if ((b = str.getByte()) === -1) {
                            this.eof = true;
                            break;
                        }
                        buffer[n] = b;
                    }
                }
                return;
            }
            var litCodeTable;
            var distCodeTable;
            if (hdr === 1) {
                // compressed block, fixed codes
                litCodeTable = fixedLitCodeTab;
                distCodeTable = fixedDistCodeTab;
            }
            else if (hdr === 2) {
                // compressed block, dynamic codes
                var numLitCodes = this.getBits(5) + 257;
                var numDistCodes = this.getBits(5) + 1;
                var numCodeLenCodes = this.getBits(4) + 4;
                // build the code lengths code table
                var codeLenCodeLengths = new Uint8Array(codeLenCodeMap.length);
                var i = void 0;
                for (i = 0; i < numCodeLenCodes; ++i) {
                    codeLenCodeLengths[codeLenCodeMap[i]] = this.getBits(3);
                }
                var codeLenCodeTab = this.generateHuffmanTable(codeLenCodeLengths);
                // build the literal and distance code tables
                len = 0;
                i = 0;
                var codes = numLitCodes + numDistCodes;
                var codeLengths = new Uint8Array(codes);
                var bitsLength = void 0;
                var bitsOffset = void 0;
                var what = void 0;
                while (i < codes) {
                    var code = this.getCode(codeLenCodeTab);
                    if (code === 16) {
                        bitsLength = 2;
                        bitsOffset = 3;
                        what = len;
                    }
                    else if (code === 17) {
                        bitsLength = 3;
                        bitsOffset = 3;
                        what = len = 0;
                    }
                    else if (code === 18) {
                        bitsLength = 7;
                        bitsOffset = 11;
                        what = len = 0;
                    }
                    else {
                        codeLengths[i++] = len = code;
                        continue;
                    }
                    var repeatLength = this.getBits(bitsLength) + bitsOffset;
                    while (repeatLength-- > 0) {
                        codeLengths[i++] = what;
                    }
                }
                litCodeTable = this.generateHuffmanTable(codeLengths.subarray(0, numLitCodes));
                distCodeTable = this.generateHuffmanTable(codeLengths.subarray(numLitCodes, codes));
            }
            else {
                throw new Error('Unknown block type in flate stream');
            }
            buffer = this.buffer;
            var limit = buffer ? buffer.length : 0;
            var pos = this.bufferLength;
            while (true) {
                var code1 = this.getCode(litCodeTable);
                if (code1 < 256) {
                    if (pos + 1 >= limit) {
                        buffer = this.ensureBuffer(pos + 1);
                        limit = buffer.length;
                    }
                    buffer[pos++] = code1;
                    continue;
                }
                if (code1 === 256) {
                    this.bufferLength = pos;
                    return;
                }
                code1 -= 257;
                code1 = lengthDecode[code1];
                var code2 = code1 >> 16;
                if (code2 > 0) {
                    code2 = this.getBits(code2);
                }
                len = (code1 & 0xffff) + code2;
                code1 = this.getCode(distCodeTable);
                code1 = distDecode[code1];
                code2 = code1 >> 16;
                if (code2 > 0) {
                    code2 = this.getBits(code2);
                }
                var dist = (code1 & 0xffff) + code2;
                if (pos + len >= limit) {
                    buffer = this.ensureBuffer(pos + len);
                    limit = buffer.length;
                }
                for (var k = 0; k < len; ++k, ++pos) {
                    buffer[pos] = buffer[pos - dist];
                }
            }
        };
        FlateStream.prototype.getBits = function (bits) {
            var str = this.stream;
            var codeSize = this.codeSize;
            var codeBuf = this.codeBuf;
            var b;
            while (codeSize < bits) {
                if ((b = str.getByte()) === -1) {
                    throw new Error('Bad encoding in flate stream');
                }
                codeBuf |= b << codeSize;
                codeSize += 8;
            }
            b = codeBuf & ((1 << bits) - 1);
            this.codeBuf = codeBuf >> bits;
            this.codeSize = codeSize -= bits;
            return b;
        };
        FlateStream.prototype.getCode = function (table) {
            var str = this.stream;
            var codes = table[0];
            var maxLen = table[1];
            var codeSize = this.codeSize;
            var codeBuf = this.codeBuf;
            var b;
            while (codeSize < maxLen) {
                if ((b = str.getByte()) === -1) {
                    // premature end of stream. code might however still be valid.
                    // codeSize < codeLen check below guards against incomplete codeVal.
                    break;
                }
                codeBuf |= b << codeSize;
                codeSize += 8;
            }
            var code = codes[codeBuf & ((1 << maxLen) - 1)];
            if (typeof codes === 'number') {
                console.log('FLATE:', code);
            }
            var codeLen = code >> 16;
            var codeVal = code & 0xffff;
            if (codeLen < 1 || codeSize < codeLen) {
                throw new Error('Bad encoding in flate stream');
            }
            this.codeBuf = codeBuf >> codeLen;
            this.codeSize = codeSize - codeLen;
            return codeVal;
        };
        FlateStream.prototype.generateHuffmanTable = function (lengths) {
            var n = lengths.length;
            // find max code length
            var maxLen = 0;
            var i;
            for (i = 0; i < n; ++i) {
                if (lengths[i] > maxLen) {
                    maxLen = lengths[i];
                }
            }
            // build the table
            var size = 1 << maxLen;
            var codes = new Int32Array(size);
            for (var len = 1, code = 0, skip = 2; len <= maxLen; ++len, code <<= 1, skip <<= 1) {
                for (var val = 0; val < n; ++val) {
                    if (lengths[val] === len) {
                        // bit-reverse the code
                        var code2 = 0;
                        var t = code;
                        for (i = 0; i < len; ++i) {
                            code2 = (code2 << 1) | (t & 1);
                            t >>= 1;
                        }
                        // fill the table entries
                        for (i = code2; i < size; i += skip) {
                            codes[i] = (len << 16) | val;
                        }
                        ++code;
                    }
                }
            }
            return [codes, maxLen];
        };
        return FlateStream;
    }(DecodeStream));
    //# sourceMappingURL=FlateStream.js.map

    /*
     * Copyright 2012 Mozilla Foundation
     *
     * The LZWStream class contained in this file is a TypeScript port of the
     * JavaScript LZWStream class in Mozilla's pdf.js project, made available
     * under the Apache 2.0 open source license.
     */
    var LZWStream = /** @class */ (function (_super) {
        __extends(LZWStream, _super);
        function LZWStream(stream, maybeLength, earlyChange) {
            var _this = _super.call(this, maybeLength) || this;
            _this.stream = stream;
            _this.cachedData = 0;
            _this.bitsCached = 0;
            var maxLzwDictionarySize = 4096;
            var lzwState = {
                earlyChange: earlyChange,
                codeLength: 9,
                nextCode: 258,
                dictionaryValues: new Uint8Array(maxLzwDictionarySize),
                dictionaryLengths: new Uint16Array(maxLzwDictionarySize),
                dictionaryPrevCodes: new Uint16Array(maxLzwDictionarySize),
                currentSequence: new Uint8Array(maxLzwDictionarySize),
                currentSequenceLength: 0,
            };
            for (var i = 0; i < 256; ++i) {
                lzwState.dictionaryValues[i] = i;
                lzwState.dictionaryLengths[i] = 1;
            }
            _this.lzwState = lzwState;
            return _this;
        }
        LZWStream.prototype.readBlock = function () {
            var blockSize = 512;
            var estimatedDecodedSize = blockSize * 2;
            var decodedSizeDelta = blockSize;
            var i;
            var j;
            var q;
            var lzwState = this.lzwState;
            if (!lzwState) {
                return; // eof was found
            }
            var earlyChange = lzwState.earlyChange;
            var nextCode = lzwState.nextCode;
            var dictionaryValues = lzwState.dictionaryValues;
            var dictionaryLengths = lzwState.dictionaryLengths;
            var dictionaryPrevCodes = lzwState.dictionaryPrevCodes;
            var codeLength = lzwState.codeLength;
            var prevCode = lzwState.prevCode;
            var currentSequence = lzwState.currentSequence;
            var currentSequenceLength = lzwState.currentSequenceLength;
            var decodedLength = 0;
            var currentBufferLength = this.bufferLength;
            var buffer = this.ensureBuffer(this.bufferLength + estimatedDecodedSize);
            for (i = 0; i < blockSize; i++) {
                var code = this.readBits(codeLength);
                var hasPrev = currentSequenceLength > 0;
                if (!code || code < 256) {
                    currentSequence[0] = code;
                    currentSequenceLength = 1;
                }
                else if (code >= 258) {
                    if (code < nextCode) {
                        currentSequenceLength = dictionaryLengths[code];
                        for (j = currentSequenceLength - 1, q = code; j >= 0; j--) {
                            currentSequence[j] = dictionaryValues[q];
                            q = dictionaryPrevCodes[q];
                        }
                    }
                    else {
                        currentSequence[currentSequenceLength++] = currentSequence[0];
                    }
                }
                else if (code === 256) {
                    codeLength = 9;
                    nextCode = 258;
                    currentSequenceLength = 0;
                    continue;
                }
                else {
                    this.eof = true;
                    delete this.lzwState;
                    break;
                }
                if (hasPrev) {
                    dictionaryPrevCodes[nextCode] = prevCode;
                    dictionaryLengths[nextCode] = dictionaryLengths[prevCode] + 1;
                    dictionaryValues[nextCode] = currentSequence[0];
                    nextCode++;
                    codeLength =
                        (nextCode + earlyChange) & (nextCode + earlyChange - 1)
                            ? codeLength
                            : Math.min(Math.log(nextCode + earlyChange) / 0.6931471805599453 + 1, 12) | 0;
                }
                prevCode = code;
                decodedLength += currentSequenceLength;
                if (estimatedDecodedSize < decodedLength) {
                    do {
                        estimatedDecodedSize += decodedSizeDelta;
                    } while (estimatedDecodedSize < decodedLength);
                    buffer = this.ensureBuffer(this.bufferLength + estimatedDecodedSize);
                }
                for (j = 0; j < currentSequenceLength; j++) {
                    buffer[currentBufferLength++] = currentSequence[j];
                }
            }
            lzwState.nextCode = nextCode;
            lzwState.codeLength = codeLength;
            lzwState.prevCode = prevCode;
            lzwState.currentSequenceLength = currentSequenceLength;
            this.bufferLength = currentBufferLength;
        };
        LZWStream.prototype.readBits = function (n) {
            var bitsCached = this.bitsCached;
            var cachedData = this.cachedData;
            while (bitsCached < n) {
                var c = this.stream.getByte();
                if (c === -1) {
                    this.eof = true;
                    return null;
                }
                cachedData = (cachedData << 8) | c;
                bitsCached += 8;
            }
            this.bitsCached = bitsCached -= n;
            this.cachedData = cachedData;
            return (cachedData >>> bitsCached) & ((1 << n) - 1);
        };
        return LZWStream;
    }(DecodeStream));
    //# sourceMappingURL=LZWStream.js.map

    /*
     * Copyright 2012 Mozilla Foundation
     *
     * The RunLengthStream class contained in this file is a TypeScript port of the
     * JavaScript RunLengthStream class in Mozilla's pdf.js project, made available
     * under the Apache 2.0 open source license.
     */
    var RunLengthStream = /** @class */ (function (_super) {
        __extends(RunLengthStream, _super);
        function RunLengthStream(stream, maybeLength) {
            var _this = _super.call(this, maybeLength) || this;
            _this.stream = stream;
            return _this;
        }
        RunLengthStream.prototype.readBlock = function () {
            // The repeatHeader has following format. The first byte defines type of run
            // and amount of bytes to repeat/copy: n = 0 through 127 - copy next n bytes
            // (in addition to the second byte from the header), n = 129 through 255 -
            // duplicate the second byte from the header (257 - n) times, n = 128 - end.
            var repeatHeader = this.stream.getBytes(2);
            if (!repeatHeader || repeatHeader.length < 2 || repeatHeader[0] === 128) {
                this.eof = true;
                return;
            }
            var buffer;
            var bufferLength = this.bufferLength;
            var n = repeatHeader[0];
            if (n < 128) {
                // copy n bytes
                buffer = this.ensureBuffer(bufferLength + n + 1);
                buffer[bufferLength++] = repeatHeader[1];
                if (n > 0) {
                    var source = this.stream.getBytes(n);
                    buffer.set(source, bufferLength);
                    bufferLength += n;
                }
            }
            else {
                n = 257 - n;
                var b = repeatHeader[1];
                buffer = this.ensureBuffer(bufferLength + n + 1);
                for (var i = 0; i < n; i++) {
                    buffer[bufferLength++] = b;
                }
            }
            this.bufferLength = bufferLength;
        };
        return RunLengthStream;
    }(DecodeStream));
    //# sourceMappingURL=RunLengthStream.js.map

    var decodeStream = function (stream, encoding, params) {
        if (encoding === PDFName.of('FlateDecode')) {
            return new FlateStream(stream);
        }
        if (encoding === PDFName.of('LZWDecode')) {
            var earlyChange = 1;
            if (params instanceof PDFDict) {
                var EarlyChange = params.lookup(PDFName.of('EarlyChange'));
                if (EarlyChange instanceof PDFNumber) {
                    earlyChange = EarlyChange.value();
                }
            }
            return new LZWStream(stream, undefined, earlyChange);
        }
        if (encoding === PDFName.of('ASCII85Decode')) {
            return new Ascii85Stream(stream);
        }
        if (encoding === PDFName.of('ASCIIHexDecode')) {
            return new AsciiHexStream(stream);
        }
        if (encoding === PDFName.of('RunLengthDecode')) {
            return new RunLengthStream(stream);
        }
        throw new UnsupportedEncodingError(encoding.value());
    };
    var decodePDFRawStream = function (_a) {
        var dict = _a.dict, contents = _a.contents;
        var stream = new Stream(contents);
        var Filter = dict.lookup(PDFName.of('Filter'));
        var DecodeParms = dict.lookup(PDFName.of('DecodeParms'));
        if (Filter instanceof PDFName) {
            stream = decodeStream(stream, Filter, DecodeParms);
        }
        else if (Filter instanceof PDFArray) {
            for (var idx = 0, len = Filter.size(); idx < len; idx++) {
                stream = decodeStream(stream, Filter.lookup(idx, PDFName), DecodeParms && DecodeParms.lookup(idx));
            }
        }
        else if (!!Filter) {
            throw new UnexpectedObjectTypeError([PDFName, PDFArray], Filter);
        }
        return stream;
    };
    //# sourceMappingURL=decode.js.map

    var fullPageBoundingBox = function (page) {
        var mediaBox = page.MediaBox();
        var width = mediaBox.lookup(2, PDFNumber).value() -
            mediaBox.lookup(0, PDFNumber).value();
        var height = mediaBox.lookup(3, PDFNumber).value() -
            mediaBox.lookup(1, PDFNumber).value();
        return { left: 0, bottom: 0, right: width, top: height };
    };
    // Returns the identity matrix, modified to position the content of the given
    // bounding box at (0, 0).
    var boundingBoxAdjustedMatrix = function (bb) { return [1, 0, 0, 1, -bb.left, -bb.bottom]; };
    var PDFPageEmbedder = /** @class */ (function () {
        function PDFPageEmbedder(page, boundingBox, transformationMatrix) {
            this.page = page;
            var bb = (boundingBox !== null && boundingBox !== void 0 ? boundingBox : fullPageBoundingBox(page));
            this.width = bb.right - bb.left;
            this.height = bb.top - bb.bottom;
            this.boundingBox = bb;
            this.transformationMatrix = (transformationMatrix !== null && transformationMatrix !== void 0 ? transformationMatrix : boundingBoxAdjustedMatrix(bb));
        }
        PDFPageEmbedder.for = function (page, boundingBox, transformationMatrix) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, new PDFPageEmbedder(page, boundingBox, transformationMatrix)];
                });
            });
        };
        PDFPageEmbedder.prototype.embedIntoContext = function (context, ref) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, Contents, Resources, decodedContents, _b, left, bottom, right, top, xObject;
                return __generator(this, function (_c) {
                    _a = this.page.normalizedEntries(), Contents = _a.Contents, Resources = _a.Resources;
                    if (!Contents)
                        throw new MissingPageContentsEmbeddingError();
                    decodedContents = this.decodeContents(Contents);
                    _b = this.boundingBox, left = _b.left, bottom = _b.bottom, right = _b.right, top = _b.top;
                    xObject = context.stream(decodedContents, {
                        Type: 'XObject',
                        Subtype: 'Form',
                        FormType: 1,
                        BBox: [left, bottom, right, top],
                        Matrix: this.transformationMatrix,
                        Resources: Resources,
                    });
                    if (ref) {
                        context.assign(ref, xObject);
                        return [2 /*return*/, ref];
                    }
                    else {
                        return [2 /*return*/, context.register(xObject)];
                    }
                });
            });
        };
        // `contents` is an array of streams which are merged to include them in the XObject.
        // This methods extracts each stream and joins them with a newline character.
        PDFPageEmbedder.prototype.decodeContents = function (contents) {
            var newline = Uint8Array.of(CharCodes$1.Newline);
            var decodedContents = [];
            for (var idx = 0, len = contents.size(); idx < len; idx++) {
                var stream = contents.lookup(idx, PDFStream);
                var content = void 0;
                if (stream instanceof PDFRawStream) {
                    content = decodePDFRawStream(stream).decode();
                }
                else if (stream instanceof PDFContentStream) {
                    content = stream.getUnencodedContents();
                }
                else {
                    throw new UnrecognizedStreamTypeError(stream);
                }
                decodedContents.push(content, newline);
            }
            return mergeIntoTypedArray.apply(void 0, decodedContents);
        };
        return PDFPageEmbedder;
    }());
    //# sourceMappingURL=PDFPageEmbedder.js.map

    var PDFCatalog = /** @class */ (function (_super) {
        __extends(PDFCatalog, _super);
        function PDFCatalog() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PDFCatalog.prototype.Pages = function () {
            return this.lookup(PDFName.of('Pages'), PDFDict);
        };
        /**
         * Inserts the given ref as a leaf node of this catalog's page tree at the
         * specified index (zero-based). Also increments the `Count` of each node in
         * the page tree hierarchy to accomodate the new page.
         *
         * Returns the ref of the PDFPageTree node into which `leafRef` was inserted.
         */
        PDFCatalog.prototype.insertLeafNode = function (leafRef, index) {
            var pagesRef = this.get(PDFName.of('Pages'));
            var maybeParentRef = this.Pages().insertLeafNode(leafRef, index);
            return maybeParentRef || pagesRef;
        };
        PDFCatalog.prototype.removeLeafNode = function (index) {
            this.Pages().removeLeafNode(index);
        };
        PDFCatalog.withContextAndPages = function (context, pages) {
            var dict = new Map();
            dict.set(PDFName.of('Type'), PDFName.of('Catalog'));
            dict.set(PDFName.of('Pages'), pages);
            return new PDFCatalog(dict, context);
        };
        PDFCatalog.fromMapWithContext = function (map, context) {
            return new PDFCatalog(map, context);
        };
        return PDFCatalog;
    }(PDFDict));
    //# sourceMappingURL=PDFCatalog.js.map

    var PDFPageTree = /** @class */ (function (_super) {
        __extends(PDFPageTree, _super);
        function PDFPageTree() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PDFPageTree.prototype.Parent = function () {
            return this.lookup(PDFName.of('Parent'));
        };
        PDFPageTree.prototype.Kids = function () {
            return this.lookup(PDFName.of('Kids'), PDFArray);
        };
        PDFPageTree.prototype.Count = function () {
            return this.lookup(PDFName.of('Count'), PDFNumber);
        };
        PDFPageTree.prototype.pushTreeNode = function (treeRef) {
            var Kids = this.Kids();
            Kids.push(treeRef);
        };
        PDFPageTree.prototype.pushLeafNode = function (leafRef) {
            var Kids = this.Kids();
            Kids.push(leafRef);
            this.ascend(function (node) {
                var Count = node.Count();
                node.set(PDFName.of('Count'), PDFNumber.of(Count.value() + 1));
            });
        };
        /**
         * Inserts the given ref as a leaf node of this page tree at the specified
         * index (zero-based). Also increments the `Count` of each page tree in the
         * hierarchy to accomodate the new page.
         *
         * Returns the ref of the PDFPageTree node into which `leafRef` was inserted,
         * or `undefined` if it was inserted into the root node (the PDFPageTree upon
         * which the method was first called).
         */
        PDFPageTree.prototype.insertLeafNode = function (leafRef, targetIndex) {
            var Kids = this.Kids();
            var kidSize = Kids.size();
            var kidIdx = 0;
            var pageIdx = 0;
            while (pageIdx < targetIndex) {
                if (kidIdx >= kidSize) {
                    throw new Error("Index out of bounds: " + kidIdx + "/" + kidSize);
                }
                var kidRef = Kids.get(kidIdx++);
                var kid = this.context.lookup(kidRef);
                if (kid instanceof PDFPageTree) {
                    var kidCount = kid.Count().value();
                    if (pageIdx + kidCount > targetIndex) {
                        return kid.insertLeafNode(leafRef, targetIndex - pageIdx) || kidRef;
                    }
                    else {
                        pageIdx += kidCount;
                    }
                }
                else {
                    pageIdx += 1;
                }
            }
            Kids.insert(kidIdx, leafRef);
            this.ascend(function (node) {
                var Count = node.Count();
                node.set(PDFName.of('Count'), PDFNumber.of(Count.value() + 1));
            });
            return undefined;
        };
        /**
         * Removes the leaf node at the specified index (zero-based) from this page
         * tree. Also decrements the `Count` of each page tree in the hierarchy to
         * account for the removed page.
         */
        PDFPageTree.prototype.removeLeafNode = function (targetIndex) {
            var Kids = this.Kids();
            var kidSize = Kids.size();
            var kidIdx = 0;
            var pageIdx = 0;
            while (pageIdx < targetIndex) {
                if (kidIdx >= kidSize) {
                    throw new Error("Index out of bounds: " + kidIdx + "/" + (kidSize - 1) + " (a)");
                }
                var kidRef = Kids.get(kidIdx++);
                var kid = this.context.lookup(kidRef);
                if (kid instanceof PDFPageTree) {
                    var kidCount = kid.Count().value();
                    if (pageIdx + kidCount > targetIndex) {
                        kid.removeLeafNode(targetIndex - pageIdx);
                        return;
                    }
                    else {
                        pageIdx += kidCount;
                    }
                }
                else {
                    pageIdx += 1;
                }
            }
            if (kidIdx >= kidSize) {
                throw new Error("Index out of bounds: " + kidIdx + "/" + (kidSize - 1) + " (b)");
            }
            var target = Kids.lookup(kidIdx);
            if (target instanceof PDFPageTree) {
                target.removeLeafNode(0);
            }
            else {
                Kids.remove(kidIdx);
                this.ascend(function (node) {
                    var Count = node.Count();
                    node.set(PDFName.of('Count'), PDFNumber.of(Count.value() - 1));
                });
            }
        };
        PDFPageTree.prototype.ascend = function (visitor) {
            visitor(this);
            var Parent = this.Parent();
            if (Parent)
                Parent.ascend(visitor);
        };
        /** Performs a Post-Order traversal of this page tree */
        PDFPageTree.prototype.traverse = function (visitor) {
            var Kids = this.Kids();
            for (var idx = 0, len = Kids.size(); idx < len; idx++) {
                var kidRef = Kids.get(idx);
                var kid = this.context.lookup(kidRef);
                if (kid instanceof PDFPageTree)
                    kid.traverse(visitor);
                visitor(kid, kidRef);
            }
        };
        PDFPageTree.withContext = function (context, parent) {
            var dict = new Map();
            dict.set(PDFName.of('Type'), PDFName.of('Pages'));
            dict.set(PDFName.of('Kids'), context.obj([]));
            dict.set(PDFName.of('Count'), context.obj(0));
            if (parent)
                dict.set(PDFName.of('Parent'), parent);
            return new PDFPageTree(dict, context);
        };
        PDFPageTree.fromMapWithContext = function (map, context) {
            return new PDFPageTree(map, context);
        };
        return PDFPageTree;
    }(PDFDict));
    //# sourceMappingURL=PDFPageTree.js.map

    var IsDigit = new Uint8Array(256);
    IsDigit[CharCodes$1.Zero] = 1;
    IsDigit[CharCodes$1.One] = 1;
    IsDigit[CharCodes$1.Two] = 1;
    IsDigit[CharCodes$1.Three] = 1;
    IsDigit[CharCodes$1.Four] = 1;
    IsDigit[CharCodes$1.Five] = 1;
    IsDigit[CharCodes$1.Six] = 1;
    IsDigit[CharCodes$1.Seven] = 1;
    IsDigit[CharCodes$1.Eight] = 1;
    IsDigit[CharCodes$1.Nine] = 1;
    var IsNumericPrefix = new Uint8Array(256);
    IsNumericPrefix[CharCodes$1.Period] = 1;
    IsNumericPrefix[CharCodes$1.Plus] = 1;
    IsNumericPrefix[CharCodes$1.Minus] = 1;
    var IsNumeric = new Uint8Array(256);
    for (var idx$1 = 0, len$1 = 256; idx$1 < len$1; idx$1++) {
        IsNumeric[idx$1] = IsDigit[idx$1] || IsNumericPrefix[idx$1] ? 1 : 0;
    }
    //# sourceMappingURL=Numeric.js.map

    var Newline = CharCodes$1.Newline, CarriageReturn = CharCodes$1.CarriageReturn;
    // TODO: Throw error if eof is reached before finishing object parse...
    var BaseParser = /** @class */ (function () {
        function BaseParser(bytes) {
            this.bytes = bytes;
        }
        BaseParser.prototype.parseRawInt = function () {
            var value = '';
            while (!this.bytes.done()) {
                var byte = this.bytes.peek();
                if (!IsDigit[byte])
                    break;
                value += charFromCode(this.bytes.next());
            }
            var numberValue = Number(value);
            if (!value || !isFinite(numberValue)) {
                throw new NumberParsingError(this.bytes.position(), value);
            }
            return numberValue;
        };
        // TODO: Maybe handle exponential format?
        // TODO: Compare performance of string concatenation to charFromCode(...bytes)
        BaseParser.prototype.parseRawNumber = function () {
            var value = '';
            // Parse integer-part, the leading (+ | - | . | 0-9)
            while (!this.bytes.done()) {
                var byte = this.bytes.peek();
                if (!IsNumeric[byte])
                    break;
                value += charFromCode(this.bytes.next());
                if (byte === CharCodes$1.Period)
                    break;
            }
            // Parse decimal-part, the trailing (0-9)
            while (!this.bytes.done()) {
                var byte = this.bytes.peek();
                if (!IsDigit[byte])
                    break;
                value += charFromCode(this.bytes.next());
            }
            var numberValue = Number(value);
            if (!value || !isFinite(numberValue)) {
                throw new NumberParsingError(this.bytes.position(), value);
            }
            return numberValue;
        };
        BaseParser.prototype.skipWhitespace = function () {
            while (!this.bytes.done() && IsWhitespace[this.bytes.peek()]) {
                this.bytes.next();
            }
        };
        BaseParser.prototype.skipLine = function () {
            while (!this.bytes.done()) {
                var byte = this.bytes.peek();
                if (byte === Newline || byte === CarriageReturn)
                    return;
                this.bytes.next();
            }
        };
        BaseParser.prototype.skipComment = function () {
            if (this.bytes.peek() !== CharCodes$1.Percent)
                return false;
            while (!this.bytes.done()) {
                var byte = this.bytes.peek();
                if (byte === Newline || byte === CarriageReturn)
                    return true;
                this.bytes.next();
            }
            return true;
        };
        BaseParser.prototype.skipWhitespaceAndComments = function () {
            this.skipWhitespace();
            while (this.skipComment())
                this.skipWhitespace();
        };
        BaseParser.prototype.matchKeyword = function (keyword) {
            var initialOffset = this.bytes.offset();
            for (var idx = 0, len = keyword.length; idx < len; idx++) {
                if (this.bytes.done() || this.bytes.next() !== keyword[idx]) {
                    this.bytes.moveTo(initialOffset);
                    return false;
                }
            }
            return true;
        };
        return BaseParser;
    }());
    //# sourceMappingURL=BaseParser.js.map

    // TODO: See how line/col tracking affects performance
    var ByteStream = /** @class */ (function () {
        function ByteStream(bytes) {
            this.idx = 0;
            this.line = 0;
            this.column = 0;
            this.bytes = bytes;
            this.length = this.bytes.length;
        }
        ByteStream.prototype.moveTo = function (offset) {
            this.idx = offset;
        };
        ByteStream.prototype.next = function () {
            var byte = this.bytes[this.idx++];
            if (byte === CharCodes$1.Newline) {
                this.line += 1;
                this.column = 0;
            }
            else {
                this.column += 1;
            }
            return byte;
        };
        ByteStream.prototype.assertNext = function (expected) {
            if (this.peek() !== expected) {
                throw new NextByteAssertionError(this.position(), expected, this.peek());
            }
            return this.next();
        };
        ByteStream.prototype.peek = function () {
            return this.bytes[this.idx];
        };
        ByteStream.prototype.peekAhead = function (steps) {
            return this.bytes[this.idx + steps];
        };
        ByteStream.prototype.peekAt = function (offset) {
            return this.bytes[offset];
        };
        ByteStream.prototype.done = function () {
            return this.idx >= this.length;
        };
        ByteStream.prototype.offset = function () {
            return this.idx;
        };
        ByteStream.prototype.slice = function (start, end) {
            return this.bytes.slice(start, end);
        };
        ByteStream.prototype.position = function () {
            return { line: this.line, column: this.column, offset: this.idx };
        };
        ByteStream.of = function (bytes) { return new ByteStream(bytes); };
        ByteStream.fromPDFRawStream = function (rawStream) {
            return ByteStream.of(decodePDFRawStream(rawStream).decode());
        };
        return ByteStream;
    }());
    //# sourceMappingURL=ByteStream.js.map

    var Space = CharCodes$1.Space, CarriageReturn$1 = CharCodes$1.CarriageReturn, Newline$1 = CharCodes$1.Newline;
    var stream = [
        CharCodes$1.s,
        CharCodes$1.t,
        CharCodes$1.r,
        CharCodes$1.e,
        CharCodes$1.a,
        CharCodes$1.m,
    ];
    var endstream = [
        CharCodes$1.e,
        CharCodes$1.n,
        CharCodes$1.d,
        CharCodes$1.s,
        CharCodes$1.t,
        CharCodes$1.r,
        CharCodes$1.e,
        CharCodes$1.a,
        CharCodes$1.m,
    ];
    var Keywords = {
        header: [
            CharCodes$1.Percent,
            CharCodes$1.P,
            CharCodes$1.D,
            CharCodes$1.F,
            CharCodes$1.Dash,
        ],
        eof: [
            CharCodes$1.Percent,
            CharCodes$1.Percent,
            CharCodes$1.E,
            CharCodes$1.O,
            CharCodes$1.F,
        ],
        obj: [CharCodes$1.o, CharCodes$1.b, CharCodes$1.j],
        endobj: [
            CharCodes$1.e,
            CharCodes$1.n,
            CharCodes$1.d,
            CharCodes$1.o,
            CharCodes$1.b,
            CharCodes$1.j,
        ],
        xref: [CharCodes$1.x, CharCodes$1.r, CharCodes$1.e, CharCodes$1.f],
        trailer: [
            CharCodes$1.t,
            CharCodes$1.r,
            CharCodes$1.a,
            CharCodes$1.i,
            CharCodes$1.l,
            CharCodes$1.e,
            CharCodes$1.r,
        ],
        startxref: [
            CharCodes$1.s,
            CharCodes$1.t,
            CharCodes$1.a,
            CharCodes$1.r,
            CharCodes$1.t,
            CharCodes$1.x,
            CharCodes$1.r,
            CharCodes$1.e,
            CharCodes$1.f,
        ],
        true: [CharCodes$1.t, CharCodes$1.r, CharCodes$1.u, CharCodes$1.e],
        false: [CharCodes$1.f, CharCodes$1.a, CharCodes$1.l, CharCodes$1.s, CharCodes$1.e],
        null: [CharCodes$1.n, CharCodes$1.u, CharCodes$1.l, CharCodes$1.l],
        stream: stream,
        streamEOF1: __spreadArrays(stream, [Space, CarriageReturn$1, Newline$1]),
        streamEOF2: __spreadArrays(stream, [CarriageReturn$1, Newline$1]),
        streamEOF3: __spreadArrays(stream, [CarriageReturn$1]),
        streamEOF4: __spreadArrays(stream, [Newline$1]),
        endstream: endstream,
        EOF1endstream: __spreadArrays([CarriageReturn$1, Newline$1], endstream),
        EOF2endstream: __spreadArrays([CarriageReturn$1], endstream),
        EOF3endstream: __spreadArrays([Newline$1], endstream),
    };
    //# sourceMappingURL=Keywords.js.map

    // TODO: Throw error if eof is reached before finishing object parse...
    var PDFObjectParser = /** @class */ (function (_super) {
        __extends(PDFObjectParser, _super);
        function PDFObjectParser(byteStream, context) {
            var _this = _super.call(this, byteStream) || this;
            _this.context = context;
            return _this;
        }
        // TODO: Is it possible to reduce duplicate parsing for ref lookaheads?
        PDFObjectParser.prototype.parseObject = function () {
            this.skipWhitespaceAndComments();
            if (this.matchKeyword(Keywords.true))
                return PDFBool.True;
            if (this.matchKeyword(Keywords.false))
                return PDFBool.False;
            if (this.matchKeyword(Keywords.null))
                return PDFNull$1;
            var byte = this.bytes.peek();
            if (byte === CharCodes$1.LessThan &&
                this.bytes.peekAhead(1) === CharCodes$1.LessThan) {
                return this.parseDictOrStream();
            }
            if (byte === CharCodes$1.LessThan)
                return this.parseHexString();
            if (byte === CharCodes$1.LeftParen)
                return this.parseString();
            if (byte === CharCodes$1.ForwardSlash)
                return this.parseName();
            if (byte === CharCodes$1.LeftSquareBracket)
                return this.parseArray();
            if (IsNumeric[byte])
                return this.parseNumberOrRef();
            throw new PDFObjectParsingError(this.bytes.position(), byte);
        };
        PDFObjectParser.prototype.parseNumberOrRef = function () {
            var firstNum = this.parseRawNumber();
            this.skipWhitespaceAndComments();
            var lookaheadStart = this.bytes.offset();
            if (IsDigit[this.bytes.peek()]) {
                var secondNum = this.parseRawNumber();
                this.skipWhitespaceAndComments();
                if (this.bytes.peek() === CharCodes$1.R) {
                    this.bytes.assertNext(CharCodes$1.R);
                    return PDFRef.of(firstNum, secondNum);
                }
            }
            this.bytes.moveTo(lookaheadStart);
            return PDFNumber.of(firstNum);
        };
        // TODO: Maybe update PDFHexString.of() logic to remove whitespace and validate input?
        PDFObjectParser.prototype.parseHexString = function () {
            var value = '';
            this.bytes.assertNext(CharCodes$1.LessThan);
            while (!this.bytes.done() && this.bytes.peek() !== CharCodes$1.GreaterThan) {
                value += charFromCode(this.bytes.next());
            }
            this.bytes.assertNext(CharCodes$1.GreaterThan);
            return PDFHexString.of(value);
        };
        PDFObjectParser.prototype.parseString = function () {
            var nestingLvl = 0;
            var isEscaped = false;
            var value = '';
            while (!this.bytes.done()) {
                var byte = this.bytes.next();
                value += charFromCode(byte);
                // Check for unescaped parenthesis
                if (!isEscaped) {
                    if (byte === CharCodes$1.LeftParen)
                        nestingLvl += 1;
                    if (byte === CharCodes$1.RightParen)
                        nestingLvl -= 1;
                }
                // Track whether current character is being escaped or not
                if (byte === CharCodes$1.BackSlash) {
                    isEscaped = !isEscaped;
                }
                else if (isEscaped) {
                    isEscaped = false;
                }
                // Once (if) the unescaped parenthesis balance out, return their contents
                if (nestingLvl === 0) {
                    // Remove the outer parens so they aren't part of the contents
                    return PDFString.of(value.substring(1, value.length - 1));
                }
            }
            throw new UnbalancedParenthesisError(this.bytes.position());
        };
        // TODO: Compare performance of string concatenation to charFromCode(...bytes)
        // TODO: Maybe preallocate small Uint8Array if can use charFromCode?
        PDFObjectParser.prototype.parseName = function () {
            this.bytes.assertNext(CharCodes$1.ForwardSlash);
            var name = '';
            while (!this.bytes.done()) {
                var byte = this.bytes.peek();
                if (byte < CharCodes$1.ExclamationPoint ||
                    byte > CharCodes$1.Tilde ||
                    IsWhitespace[byte] ||
                    IsDelimiter[byte]) {
                    break;
                }
                name += charFromCode(byte);
                this.bytes.next();
            }
            return PDFName.of(name);
        };
        PDFObjectParser.prototype.parseArray = function () {
            this.bytes.assertNext(CharCodes$1.LeftSquareBracket);
            this.skipWhitespaceAndComments();
            var pdfArray = PDFArray.withContext(this.context);
            while (this.bytes.peek() !== CharCodes$1.RightSquareBracket) {
                var element = this.parseObject();
                pdfArray.push(element);
                this.skipWhitespaceAndComments();
            }
            this.bytes.assertNext(CharCodes$1.RightSquareBracket);
            return pdfArray;
        };
        PDFObjectParser.prototype.parseDict = function () {
            this.bytes.assertNext(CharCodes$1.LessThan);
            this.bytes.assertNext(CharCodes$1.LessThan);
            this.skipWhitespaceAndComments();
            var dict = new Map();
            while (!this.bytes.done() &&
                this.bytes.peek() !== CharCodes$1.GreaterThan &&
                this.bytes.peekAhead(1) !== CharCodes$1.GreaterThan) {
                var key = this.parseName();
                var value = this.parseObject();
                dict.set(key, value);
                this.skipWhitespaceAndComments();
            }
            this.skipWhitespaceAndComments();
            this.bytes.assertNext(CharCodes$1.GreaterThan);
            this.bytes.assertNext(CharCodes$1.GreaterThan);
            var Type = dict.get(PDFName.of('Type'));
            if (Type === PDFName.of('Catalog')) {
                return PDFCatalog.fromMapWithContext(dict, this.context);
            }
            else if (Type === PDFName.of('Pages')) {
                return PDFPageTree.fromMapWithContext(dict, this.context);
            }
            else if (Type === PDFName.of('Page')) {
                return PDFPageLeaf.fromMapWithContext(dict, this.context);
            }
            else {
                return PDFDict.fromMapWithContext(dict, this.context);
            }
        };
        PDFObjectParser.prototype.parseDictOrStream = function () {
            var startPos = this.bytes.position();
            var dict = this.parseDict();
            this.skipWhitespaceAndComments();
            if (!this.matchKeyword(Keywords.streamEOF1) &&
                !this.matchKeyword(Keywords.streamEOF2) &&
                !this.matchKeyword(Keywords.streamEOF3) &&
                !this.matchKeyword(Keywords.streamEOF4) &&
                !this.matchKeyword(Keywords.stream)) {
                return dict;
            }
            var start = this.bytes.offset();
            var end;
            var Length = dict.get(PDFName.of('Length'));
            if (Length instanceof PDFNumber) {
                end = start + Length.value();
                this.bytes.moveTo(end);
                this.skipWhitespaceAndComments();
                if (!this.matchKeyword(Keywords.endstream)) {
                    this.bytes.moveTo(start);
                    end = this.findEndOfStreamFallback(startPos);
                }
            }
            else {
                end = this.findEndOfStreamFallback(startPos);
            }
            var contents = this.bytes.slice(start, end);
            return PDFRawStream.of(dict, contents);
        };
        PDFObjectParser.prototype.findEndOfStreamFallback = function (startPos) {
            // Move to end of stream, while handling nested streams
            var nestingLvl = 1;
            var end = this.bytes.offset();
            while (!this.bytes.done()) {
                end = this.bytes.offset();
                if (this.matchKeyword(Keywords.stream)) {
                    nestingLvl += 1;
                }
                else if (this.matchKeyword(Keywords.EOF1endstream) ||
                    this.matchKeyword(Keywords.EOF2endstream) ||
                    this.matchKeyword(Keywords.EOF3endstream) ||
                    this.matchKeyword(Keywords.endstream)) {
                    nestingLvl -= 1;
                }
                else {
                    this.bytes.next();
                }
                if (nestingLvl === 0)
                    break;
            }
            if (nestingLvl !== 0)
                throw new PDFStreamParsingError(startPos);
            return end;
        };
        PDFObjectParser.forBytes = function (bytes, context) {
            return new PDFObjectParser(ByteStream.of(bytes), context);
        };
        PDFObjectParser.forByteStream = function (byteStream, context) {
            return new PDFObjectParser(byteStream, context);
        };
        return PDFObjectParser;
    }(BaseParser));
    //# sourceMappingURL=PDFObjectParser.js.map

    var PDFObjectStreamParser = /** @class */ (function (_super) {
        __extends(PDFObjectStreamParser, _super);
        function PDFObjectStreamParser(rawStream, shouldWaitForTick) {
            var _this = _super.call(this, ByteStream.fromPDFRawStream(rawStream), rawStream.dict.context) || this;
            var dict = rawStream.dict;
            _this.alreadyParsed = false;
            _this.shouldWaitForTick = shouldWaitForTick || (function () { return false; });
            _this.firstOffset = dict.lookup(PDFName.of('First'), PDFNumber).value();
            _this.objectCount = dict.lookup(PDFName.of('N'), PDFNumber).value();
            return _this;
        }
        PDFObjectStreamParser.prototype.parseIntoContext = function () {
            return __awaiter(this, void 0, void 0, function () {
                var offsetsAndObjectNumbers, idx, len, _a, objectNumber, offset, object, ref;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (this.alreadyParsed) {
                                throw new ReparseError('PDFObjectStreamParser', 'parseIntoContext');
                            }
                            this.alreadyParsed = true;
                            offsetsAndObjectNumbers = this.parseOffsetsAndObjectNumbers();
                            idx = 0, len = offsetsAndObjectNumbers.length;
                            _b.label = 1;
                        case 1:
                            if (!(idx < len)) return [3 /*break*/, 4];
                            _a = offsetsAndObjectNumbers[idx], objectNumber = _a.objectNumber, offset = _a.offset;
                            this.bytes.moveTo(this.firstOffset + offset);
                            object = this.parseObject();
                            ref = PDFRef.of(objectNumber, 0);
                            this.context.assign(ref, object);
                            if (!this.shouldWaitForTick()) return [3 /*break*/, 3];
                            return [4 /*yield*/, waitForTick()];
                        case 2:
                            _b.sent();
                            _b.label = 3;
                        case 3:
                            idx++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        PDFObjectStreamParser.prototype.parseOffsetsAndObjectNumbers = function () {
            var offsetsAndObjectNumbers = [];
            for (var idx = 0, len = this.objectCount; idx < len; idx++) {
                this.skipWhitespaceAndComments();
                var objectNumber = this.parseRawInt();
                this.skipWhitespaceAndComments();
                var offset = this.parseRawInt();
                offsetsAndObjectNumbers.push({ objectNumber: objectNumber, offset: offset });
            }
            return offsetsAndObjectNumbers;
        };
        PDFObjectStreamParser.forStream = function (rawStream, shouldWaitForTick) { return new PDFObjectStreamParser(rawStream, shouldWaitForTick); };
        return PDFObjectStreamParser;
    }(PDFObjectParser));
    //# sourceMappingURL=PDFObjectStreamParser.js.map

    var PDFXRefStreamParser = /** @class */ (function () {
        function PDFXRefStreamParser(rawStream) {
            this.alreadyParsed = false;
            this.dict = rawStream.dict;
            this.bytes = ByteStream.fromPDFRawStream(rawStream);
            this.context = this.dict.context;
            var Size = this.dict.lookup(PDFName.of('Size'), PDFNumber);
            var Index = this.dict.lookup(PDFName.of('Index'));
            if (Index instanceof PDFArray) {
                this.subsections = [];
                for (var idx = 0, len = Index.size(); idx < len; idx += 2) {
                    var firstObjectNumber = Index.lookup(idx + 0, PDFNumber).value();
                    var length_1 = Index.lookup(idx + 1, PDFNumber).value();
                    this.subsections.push({ firstObjectNumber: firstObjectNumber, length: length_1 });
                }
            }
            else {
                this.subsections = [{ firstObjectNumber: 0, length: Size.value() }];
            }
            var W = this.dict.lookup(PDFName.of('W'), PDFArray);
            this.byteWidths = [-1, -1, -1];
            for (var idx = 0, len = W.size(); idx < len; idx++) {
                this.byteWidths[idx] = W.lookup(idx, PDFNumber).value();
            }
        }
        PDFXRefStreamParser.prototype.parseIntoContext = function () {
            if (this.alreadyParsed) {
                throw new ReparseError('PDFXRefStreamParser', 'parseIntoContext');
            }
            this.alreadyParsed = true;
            this.context.trailerInfo = {
                Root: this.dict.get(PDFName.of('Root')),
                Encrypt: this.dict.get(PDFName.of('Encrypt')),
                Info: this.dict.get(PDFName.of('Info')),
                ID: this.dict.get(PDFName.of('ID')),
            };
            var entries = this.parseEntries();
            // for (let idx = 0, len = entries.length; idx < len; idx++) {
            // const entry = entries[idx];
            // if (entry.deleted) this.context.delete(entry.ref);
            // }
            return entries;
        };
        PDFXRefStreamParser.prototype.parseEntries = function () {
            var entries = [];
            var _a = this.byteWidths, typeFieldWidth = _a[0], offsetFieldWidth = _a[1], genFieldWidth = _a[2];
            for (var subsectionIdx = 0, subsectionLen = this.subsections.length; subsectionIdx < subsectionLen; subsectionIdx++) {
                var _b = this.subsections[subsectionIdx], firstObjectNumber = _b.firstObjectNumber, length_2 = _b.length;
                for (var objIdx = 0; objIdx < length_2; objIdx++) {
                    var type = 0;
                    for (var idx = 0, len = typeFieldWidth; idx < len; idx++) {
                        type = (type << 8) | this.bytes.next();
                    }
                    var offset = 0;
                    for (var idx = 0, len = offsetFieldWidth; idx < len; idx++) {
                        offset = (offset << 8) | this.bytes.next();
                    }
                    var generationNumber = 0;
                    for (var idx = 0, len = genFieldWidth; idx < len; idx++) {
                        generationNumber = (generationNumber << 8) | this.bytes.next();
                    }
                    // When the `type` field is absent, it defaults to 1
                    if (typeFieldWidth === 0)
                        type = 1;
                    var objectNumber = firstObjectNumber + objIdx;
                    var entry = {
                        ref: PDFRef.of(objectNumber, generationNumber),
                        offset: offset,
                        deleted: type === 0,
                        inObjectStream: type === 2,
                    };
                    entries.push(entry);
                }
            }
            return entries;
        };
        PDFXRefStreamParser.forStream = function (rawStream) {
            return new PDFXRefStreamParser(rawStream);
        };
        return PDFXRefStreamParser;
    }());
    //# sourceMappingURL=PDFXRefStreamParser.js.map

    var PDFParser = /** @class */ (function (_super) {
        __extends(PDFParser, _super);
        function PDFParser(pdfBytes, objectsPerTick, throwOnInvalidObject) {
            if (objectsPerTick === void 0) { objectsPerTick = Infinity; }
            if (throwOnInvalidObject === void 0) { throwOnInvalidObject = false; }
            var _this = _super.call(this, ByteStream.of(pdfBytes), PDFContext.create()) || this;
            _this.alreadyParsed = false;
            _this.parsedObjects = 0;
            _this.shouldWaitForTick = function () {
                _this.parsedObjects += 1;
                return _this.parsedObjects % _this.objectsPerTick === 0;
            };
            _this.objectsPerTick = objectsPerTick;
            _this.throwOnInvalidObject = throwOnInvalidObject;
            return _this;
        }
        PDFParser.prototype.parseDocument = function () {
            return __awaiter(this, void 0, void 0, function () {
                var prevOffset, offset;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.alreadyParsed) {
                                throw new ReparseError('PDFParser', 'parseDocument');
                            }
                            this.alreadyParsed = true;
                            this.context.header = this.parseHeader();
                            _a.label = 1;
                        case 1:
                            if (!!this.bytes.done()) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.parseDocumentSection()];
                        case 2:
                            _a.sent();
                            offset = this.bytes.offset();
                            if (offset === prevOffset) {
                                throw new StalledParserError(this.bytes.position());
                            }
                            prevOffset = offset;
                            return [3 /*break*/, 1];
                        case 3:
                            this.maybeRecoverRoot();
                            return [2 /*return*/, this.context];
                    }
                });
            });
        };
        PDFParser.prototype.maybeRecoverRoot = function () {
            var isValidCatalog = function (obj) {
                return obj instanceof PDFDict &&
                    obj.lookup(PDFName.of('Type')) === PDFName.of('Catalog');
            };
            var catalog = this.context.lookup(this.context.trailerInfo.Root);
            if (!isValidCatalog(catalog)) {
                var indirectObjects = this.context.enumerateIndirectObjects();
                for (var idx = 0, len = indirectObjects.length; idx < len; idx++) {
                    var _a = indirectObjects[idx], ref = _a[0], object = _a[1];
                    if (isValidCatalog(object)) {
                        this.context.trailerInfo.Root = ref;
                    }
                }
            }
        };
        PDFParser.prototype.parseHeader = function () {
            while (!this.bytes.done()) {
                if (this.matchKeyword(Keywords.header)) {
                    var major = this.parseRawInt();
                    this.bytes.assertNext(CharCodes$1.Period);
                    var minor = this.parseRawInt();
                    var header = PDFHeader.forVersion(major, minor);
                    this.skipBinaryHeaderComment();
                    return header;
                }
                this.bytes.next();
            }
            throw new MissingPDFHeaderError(this.bytes.position());
        };
        PDFParser.prototype.parseIndirectObjectHeader = function () {
            this.skipWhitespaceAndComments();
            var objectNumber = this.parseRawInt();
            this.skipWhitespaceAndComments();
            var generationNumber = this.parseRawInt();
            this.skipWhitespaceAndComments();
            if (!this.matchKeyword(Keywords.obj)) {
                throw new MissingKeywordError(this.bytes.position(), Keywords.obj);
            }
            return PDFRef.of(objectNumber, generationNumber);
        };
        PDFParser.prototype.matchIndirectObjectHeader = function () {
            var initialOffset = this.bytes.offset();
            try {
                this.parseIndirectObjectHeader();
                return true;
            }
            catch (e) {
                this.bytes.moveTo(initialOffset);
                return false;
            }
        };
        PDFParser.prototype.parseIndirectObject = function () {
            return __awaiter(this, void 0, void 0, function () {
                var ref, object;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            ref = this.parseIndirectObjectHeader();
                            this.skipWhitespaceAndComments();
                            object = this.parseObject();
                            this.skipWhitespaceAndComments();
                            // if (!this.matchKeyword(Keywords.endobj)) {
                            // throw new MissingKeywordError(this.bytes.position(), Keywords.endobj);
                            // }
                            // TODO: Log a warning if this fails...
                            this.matchKeyword(Keywords.endobj);
                            if (!(object instanceof PDFRawStream &&
                                object.dict.lookup(PDFName.of('Type')) === PDFName.of('ObjStm'))) return [3 /*break*/, 2];
                            return [4 /*yield*/, PDFObjectStreamParser.forStream(object, this.shouldWaitForTick).parseIntoContext()];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            if (object instanceof PDFRawStream &&
                                object.dict.lookup(PDFName.of('Type')) === PDFName.of('XRef')) {
                                PDFXRefStreamParser.forStream(object).parseIntoContext();
                            }
                            else {
                                this.context.assign(ref, object);
                            }
                            _a.label = 3;
                        case 3: return [2 /*return*/, ref];
                    }
                });
            });
        };
        // TODO: Improve and clean this up
        PDFParser.prototype.tryToParseInvalidIndirectObject = function () {
            var startPos = this.bytes.position();
            var msg = "Trying to parse invalid object: " + JSON.stringify(startPos) + ")";
            if (this.throwOnInvalidObject)
                throw new Error(msg);
            console.warn(msg);
            var ref = this.parseIndirectObjectHeader();
            console.warn("Invalid object ref: " + ref);
            this.skipWhitespaceAndComments();
            var start = this.bytes.offset();
            var failed = true;
            while (!this.bytes.done()) {
                if (this.matchKeyword(Keywords.endobj)) {
                    failed = false;
                }
                if (!failed)
                    break;
                this.bytes.next();
            }
            if (failed)
                throw new PDFInvalidObjectParsingError(startPos);
            var end = this.bytes.offset() - Keywords.endobj.length;
            var object = PDFInvalidObject.of(this.bytes.slice(start, end));
            this.context.assign(ref, object);
            return ref;
        };
        PDFParser.prototype.parseIndirectObjects = function () {
            return __awaiter(this, void 0, void 0, function () {
                var initialOffset, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.skipWhitespaceAndComments();
                            _a.label = 1;
                        case 1:
                            if (!(!this.bytes.done() && IsDigit[this.bytes.peek()])) return [3 /*break*/, 8];
                            initialOffset = this.bytes.offset();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.parseIndirectObject()];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _a.sent();
                            // TODO: Add tracing/logging mechanism to track when this happens!
                            this.bytes.moveTo(initialOffset);
                            this.tryToParseInvalidIndirectObject();
                            return [3 /*break*/, 5];
                        case 5:
                            this.skipWhitespaceAndComments();
                            // TODO: Can this be done only when needed, to avoid harming performance?
                            this.skipJibberish();
                            if (!this.shouldWaitForTick()) return [3 /*break*/, 7];
                            return [4 /*yield*/, waitForTick()];
                        case 6:
                            _a.sent();
                            _a.label = 7;
                        case 7: return [3 /*break*/, 1];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        PDFParser.prototype.maybeParseCrossRefSection = function () {
            this.skipWhitespaceAndComments();
            if (!this.matchKeyword(Keywords.xref))
                return;
            this.skipWhitespaceAndComments();
            var objectNumber = -1;
            var xref = PDFCrossRefSection.createEmpty();
            while (!this.bytes.done() && IsDigit[this.bytes.peek()]) {
                var firstInt = this.parseRawInt();
                this.skipWhitespaceAndComments();
                var secondInt = this.parseRawInt();
                this.skipWhitespaceAndComments();
                var byte = this.bytes.peek();
                if (byte === CharCodes$1.n || byte === CharCodes$1.f) {
                    var ref = PDFRef.of(objectNumber, secondInt);
                    if (this.bytes.next() === CharCodes$1.n) {
                        xref.addEntry(ref, firstInt);
                    }
                    else {
                        // this.context.delete(ref);
                        xref.addDeletedEntry(ref, firstInt);
                    }
                    objectNumber += 1;
                }
                else {
                    objectNumber = firstInt;
                }
                this.skipWhitespaceAndComments();
            }
            return xref;
        };
        PDFParser.prototype.maybeParseTrailerDict = function () {
            this.skipWhitespaceAndComments();
            if (!this.matchKeyword(Keywords.trailer))
                return;
            this.skipWhitespaceAndComments();
            var dict = this.parseDict();
            var context = this.context;
            context.trailerInfo = {
                Root: dict.get(PDFName.of('Root')) || context.trailerInfo.Root,
                Encrypt: dict.get(PDFName.of('Encrypt')) || context.trailerInfo.Encrypt,
                Info: dict.get(PDFName.of('Info')) || context.trailerInfo.Info,
                ID: dict.get(PDFName.of('ID')) || context.trailerInfo.ID,
            };
        };
        PDFParser.prototype.maybeParseTrailer = function () {
            this.skipWhitespaceAndComments();
            if (!this.matchKeyword(Keywords.startxref))
                return;
            this.skipWhitespaceAndComments();
            var offset = this.parseRawInt();
            this.skipWhitespace();
            this.matchKeyword(Keywords.eof);
            this.skipWhitespaceAndComments();
            this.matchKeyword(Keywords.eof);
            this.skipWhitespaceAndComments();
            return PDFTrailer.forLastCrossRefSectionOffset(offset);
        };
        PDFParser.prototype.parseDocumentSection = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.parseIndirectObjects()];
                        case 1:
                            _a.sent();
                            this.maybeParseCrossRefSection();
                            this.maybeParseTrailerDict();
                            this.maybeParseTrailer();
                            // TODO: Can this be done only when needed, to avoid harming performance?
                            this.skipJibberish();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * This operation is not necessary for valid PDF files. But some invalid PDFs
         * contain jibberish in between indirect objects. This method is designed to
         * skip past that jibberish, should it exist, until it reaches the next
         * indirect object header, an xref table section, or the file trailer.
         */
        PDFParser.prototype.skipJibberish = function () {
            this.skipWhitespaceAndComments();
            while (!this.bytes.done()) {
                var initialOffset = this.bytes.offset();
                var byte = this.bytes.peek();
                var isAlphaNumeric = byte >= CharCodes$1.Space && byte <= CharCodes$1.Tilde;
                if (isAlphaNumeric) {
                    if (this.matchKeyword(Keywords.xref) ||
                        this.matchKeyword(Keywords.trailer) ||
                        this.matchKeyword(Keywords.startxref) ||
                        this.matchIndirectObjectHeader()) {
                        this.bytes.moveTo(initialOffset);
                        break;
                    }
                }
                this.bytes.next();
            }
        };
        /**
         * Skips the binary comment following a PDF header. The specification
         * defines this binary comment (section 7.5.2 File Header) as a sequence of 4
         * or more bytes that are 128 or greater, and which are preceded by a "%".
         *
         * This would imply that to strip out this binary comment, we could check for
         * a sequence of bytes starting with "%", and remove all subsequent bytes that
         * are 128 or greater. This works for many documents that properly comply with
         * the spec. But in the wild, there are PDFs that omit the leading "%", and
         * include bytes that are less than 128 (e.g. 0 or 1). So in order to parse
         * these headers correctly, we just throw out all bytes leading up to the
         * first indirect object header.
         */
        PDFParser.prototype.skipBinaryHeaderComment = function () {
            this.skipWhitespaceAndComments();
            try {
                var initialOffset = this.bytes.offset();
                this.parseIndirectObjectHeader();
                this.bytes.moveTo(initialOffset);
            }
            catch (e) {
                this.bytes.next();
                this.skipWhitespaceAndComments();
            }
        };
        PDFParser.forBytesWithOptions = function (pdfBytes, objectsPerTick, throwOnInvalidObject) { return new PDFParser(pdfBytes, objectsPerTick, throwOnInvalidObject); };
        return PDFParser;
    }(PDFObjectParser));
    //# sourceMappingURL=PDFParser.js.map

    var asPDFName = function (name) {
        return name instanceof PDFName ? name : PDFName.of(name);
    };
    var asPDFNumber = function (num) {
        return num instanceof PDFNumber ? num : PDFNumber.of(num);
    };
    var asNumber = function (num) {
        return num instanceof PDFNumber ? num.value() : num;
    };
    //# sourceMappingURL=objects.js.map

    var RotationTypes;
    (function (RotationTypes) {
        RotationTypes["Degrees"] = "degrees";
        RotationTypes["Radians"] = "radians";
    })(RotationTypes || (RotationTypes = {}));
    var degrees = function (degreeAngle) {
        assertIs(degreeAngle, 'degreeAngle', ['number']);
        return { type: RotationTypes.Degrees, angle: degreeAngle };
    };
    var Radians = RotationTypes.Radians, Degrees = RotationTypes.Degrees;
    var degreesToRadians = function (degree) { return (degree * Math.PI) / 180; };
    var radiansToDegrees = function (radian) { return (radian * 180) / Math.PI; };
    // prettier-ignore
    var toRadians = function (rotation) {
        return rotation.type === Radians ? rotation.angle
            : rotation.type === Degrees ? degreesToRadians(rotation.angle)
                : error("Invalid rotation: " + JSON.stringify(rotation));
    };
    // prettier-ignore
    var toDegrees = function (rotation) {
        return rotation.type === Radians ? radiansToDegrees(rotation.angle)
            : rotation.type === Degrees ? rotation.angle
                : error("Invalid rotation: " + JSON.stringify(rotation));
    };
    //# sourceMappingURL=rotations.js.map

    /* ==================== Graphics State Operators ==================== */
    var cos = Math.cos, sin = Math.sin, tan = Math.tan;
    var concatTransformationMatrix = function (a, b, c, d, e, f) {
        return PDFOperator.of(Ops.ConcatTransformationMatrix, [
            asPDFNumber(a),
            asPDFNumber(b),
            asPDFNumber(c),
            asPDFNumber(d),
            asPDFNumber(e),
            asPDFNumber(f),
        ]);
    };
    var translate = function (xPos, yPos) {
        return concatTransformationMatrix(1, 0, 0, 1, xPos, yPos);
    };
    var scale = function (xPos, yPos) {
        return concatTransformationMatrix(xPos, 0, 0, yPos, 0, 0);
    };
    var rotateRadians = function (angle) {
        return concatTransformationMatrix(cos(asNumber(angle)), sin(asNumber(angle)), -sin(asNumber(angle)), cos(asNumber(angle)), 0, 0);
    };
    var skewRadians = function (xSkewAngle, ySkewAngle) {
        return concatTransformationMatrix(1, tan(asNumber(xSkewAngle)), tan(asNumber(ySkewAngle)), 1, 0, 0);
    };
    var LineCapStyle;
    (function (LineCapStyle) {
        LineCapStyle[LineCapStyle["Butt"] = 0] = "Butt";
        LineCapStyle[LineCapStyle["Round"] = 1] = "Round";
        LineCapStyle[LineCapStyle["Projecting"] = 2] = "Projecting";
    })(LineCapStyle || (LineCapStyle = {}));
    var LineJoinStyle;
    (function (LineJoinStyle) {
        LineJoinStyle[LineJoinStyle["Miter"] = 0] = "Miter";
        LineJoinStyle[LineJoinStyle["Round"] = 1] = "Round";
        LineJoinStyle[LineJoinStyle["Bevel"] = 2] = "Bevel";
    })(LineJoinStyle || (LineJoinStyle = {}));
    var pushGraphicsState = function () { return PDFOperator.of(Ops.PushGraphicsState); };
    var popGraphicsState = function () { return PDFOperator.of(Ops.PopGraphicsState); };
    var setLineWidth = function (width) {
        return PDFOperator.of(Ops.SetLineWidth, [asPDFNumber(width)]);
    };
    /* ==================== Path Construction Operators ==================== */
    var appendBezierCurve = function (x1, y1, x2, y2, x3, y3) {
        return PDFOperator.of(Ops.AppendBezierCurve, [
            asPDFNumber(x1),
            asPDFNumber(y1),
            asPDFNumber(x2),
            asPDFNumber(y2),
            asPDFNumber(x3),
            asPDFNumber(y3),
        ]);
    };
    var appendQuadraticCurve = function (x1, y1, x2, y2) {
        return PDFOperator.of(Ops.CurveToReplicateInitialPoint, [
            asPDFNumber(x1),
            asPDFNumber(y1),
            asPDFNumber(x2),
            asPDFNumber(y2),
        ]);
    };
    var closePath = function () { return PDFOperator.of(Ops.ClosePath); };
    var moveTo = function (xPos, yPos) {
        return PDFOperator.of(Ops.MoveTo, [asPDFNumber(xPos), asPDFNumber(yPos)]);
    };
    var lineTo = function (xPos, yPos) {
        return PDFOperator.of(Ops.LineTo, [asPDFNumber(xPos), asPDFNumber(yPos)]);
    };
    /* ==================== Path Painting Operators ==================== */
    var stroke = function () { return PDFOperator.of(Ops.StrokePath); };
    var fill = function () { return PDFOperator.of(Ops.FillNonZero); };
    var fillAndStroke = function () { return PDFOperator.of(Ops.FillNonZeroAndStroke); };
    /* ==================== Text Positioning Operators ==================== */
    var nextLine = function () { return PDFOperator.of(Ops.NextLine); };
    /* ==================== Text Showing Operators ==================== */
    var showText = function (text) {
        return PDFOperator.of(Ops.ShowText, [text]);
    };
    /* ==================== Text State Operators ==================== */
    var beginText = function () { return PDFOperator.of(Ops.BeginText); };
    var endText = function () { return PDFOperator.of(Ops.EndText); };
    var setFontAndSize = function (name, size) { return PDFOperator.of(Ops.SetFontAndSize, [asPDFName(name), asPDFNumber(size)]); };
    var setLineHeight = function (lineHeight) {
        return PDFOperator.of(Ops.SetTextLineHeight, [asPDFNumber(lineHeight)]);
    };
    var TextRenderingMode;
    (function (TextRenderingMode) {
        TextRenderingMode[TextRenderingMode["Fill"] = 0] = "Fill";
        TextRenderingMode[TextRenderingMode["Outline"] = 1] = "Outline";
        TextRenderingMode[TextRenderingMode["FillAndOutline"] = 2] = "FillAndOutline";
        TextRenderingMode[TextRenderingMode["Invisible"] = 3] = "Invisible";
        TextRenderingMode[TextRenderingMode["FillAndClip"] = 4] = "FillAndClip";
        TextRenderingMode[TextRenderingMode["OutlineAndClip"] = 5] = "OutlineAndClip";
        TextRenderingMode[TextRenderingMode["FillAndOutlineAndClip"] = 6] = "FillAndOutlineAndClip";
        TextRenderingMode[TextRenderingMode["Clip"] = 7] = "Clip";
    })(TextRenderingMode || (TextRenderingMode = {}));
    var setTextMatrix = function (a, b, c, d, e, f) {
        return PDFOperator.of(Ops.SetTextMatrix, [
            asPDFNumber(a),
            asPDFNumber(b),
            asPDFNumber(c),
            asPDFNumber(d),
            asPDFNumber(e),
            asPDFNumber(f),
        ]);
    };
    var rotateAndSkewTextRadiansAndTranslate = function (rotationAngle, xSkewAngle, ySkewAngle, x, y) {
        return setTextMatrix(cos(asNumber(rotationAngle)), sin(asNumber(rotationAngle)) + tan(asNumber(xSkewAngle)), -sin(asNumber(rotationAngle)) + tan(asNumber(ySkewAngle)), cos(asNumber(rotationAngle)), x, y);
    };
    /* ==================== XObject Operator ==================== */
    var drawObject = function (name) {
        return PDFOperator.of(Ops.DrawObject, [asPDFName(name)]);
    };
    /* ==================== Color Operators ==================== */
    var setFillingGrayscaleColor = function (gray) {
        return PDFOperator.of(Ops.NonStrokingColorGray, [asPDFNumber(gray)]);
    };
    var setStrokingGrayscaleColor = function (gray) {
        return PDFOperator.of(Ops.StrokingColorGray, [asPDFNumber(gray)]);
    };
    var setFillingRgbColor = function (red, green, blue) {
        return PDFOperator.of(Ops.NonStrokingColorRgb, [
            asPDFNumber(red),
            asPDFNumber(green),
            asPDFNumber(blue),
        ]);
    };
    var setStrokingRgbColor = function (red, green, blue) {
        return PDFOperator.of(Ops.StrokingColorRgb, [
            asPDFNumber(red),
            asPDFNumber(green),
            asPDFNumber(blue),
        ]);
    };
    var setFillingCmykColor = function (cyan, magenta, yellow, key) {
        return PDFOperator.of(Ops.NonStrokingColorCmyk, [
            asPDFNumber(cyan),
            asPDFNumber(magenta),
            asPDFNumber(yellow),
            asPDFNumber(key),
        ]);
    };
    var setStrokingCmykColor = function (cyan, magenta, yellow, key) {
        return PDFOperator.of(Ops.StrokingColorCmyk, [
            asPDFNumber(cyan),
            asPDFNumber(magenta),
            asPDFNumber(yellow),
            asPDFNumber(key),
        ]);
    };
    //# sourceMappingURL=operators.js.map

    var ColorTypes;
    (function (ColorTypes) {
        ColorTypes["Grayscale"] = "Grayscale";
        ColorTypes["RGB"] = "RGB";
        ColorTypes["CMYK"] = "CMYK";
    })(ColorTypes || (ColorTypes = {}));
    var rgb = function (red, green, blue) {
        assertRange(red, 'red', 0, 1);
        assertRange(green, 'green', 0, 1);
        assertRange(blue, 'blue', 0, 1);
        return { type: ColorTypes.RGB, red: red, green: green, blue: blue };
    };
    var Grayscale = ColorTypes.Grayscale, RGB = ColorTypes.RGB, CMYK = ColorTypes.CMYK;
    // prettier-ignore
    var setFillingColor = function (color) {
        return color.type === Grayscale ? setFillingGrayscaleColor(color.gray)
            : color.type === RGB ? setFillingRgbColor(color.red, color.green, color.blue)
                : color.type === CMYK ? setFillingCmykColor(color.cyan, color.magenta, color.yellow, color.key)
                    : error("Invalid color: " + JSON.stringify(color));
    };
    // prettier-ignore
    var setStrokingColor = function (color) {
        return color.type === Grayscale ? setStrokingGrayscaleColor(color.gray)
            : color.type === RGB ? setStrokingRgbColor(color.red, color.green, color.blue)
                : color.type === CMYK ? setStrokingCmykColor(color.cyan, color.magenta, color.yellow, color.key)
                    : error("Invalid color: " + JSON.stringify(color));
    };
    //# sourceMappingURL=colors.js.map

    // tslint:disable: max-classes-per-file
    // TODO: Include link to documentation with example
    var EncryptedPDFError = /** @class */ (function (_super) {
        __extends(EncryptedPDFError, _super);
        function EncryptedPDFError() {
            var _this = this;
            var msg = 'Input document to `PDFDocument.load` is encrypted. You can use `PDFDocument.load(..., { ignoreEncryption: true })` if you wish to load the document anyways.';
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return EncryptedPDFError;
    }(Error));
    // TODO: Include link to documentation with example
    var FontkitNotRegisteredError = /** @class */ (function (_super) {
        __extends(FontkitNotRegisteredError, _super);
        function FontkitNotRegisteredError() {
            var _this = this;
            var msg = 'Input to `PDFDocument.embedFont` was a custom font, but no `fontkit` instance was found. You must register a `fontkit` instance with `PDFDocument.registerFontkit(...)` before embedding custom fonts.';
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return FontkitNotRegisteredError;
    }(Error));
    // TODO: Include link to documentation with example
    var ForeignPageError = /** @class */ (function (_super) {
        __extends(ForeignPageError, _super);
        function ForeignPageError() {
            var _this = this;
            var msg = 'A `page` passed to `PDFDocument.addPage` or `PDFDocument.insertPage` was from a different (foreign) PDF document. If you want to copy pages from one PDFDocument to another, you must use `PDFDocument.copyPages(...)` to copy the pages before adding or inserting them.';
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return ForeignPageError;
    }(Error));
    // TODO: Include link to documentation with example
    var RemovePageFromEmptyDocumentError = /** @class */ (function (_super) {
        __extends(RemovePageFromEmptyDocumentError, _super);
        function RemovePageFromEmptyDocumentError() {
            var _this = this;
            var msg = 'PDFDocument has no pages so `PDFDocument.removePage` cannot be called';
            _this = _super.call(this, msg) || this;
            return _this;
        }
        return RemovePageFromEmptyDocumentError;
    }(Error));
    //# sourceMappingURL=errors.js.map

    // Originated from pdfkit Copyright (c) 2014 Devon Govett
    var cx = 0;
    var cy = 0;
    var px = 0;
    var py = 0;
    var sx = 0;
    var sy = 0;
    var parameters = new Map([
        ['A', 7],
        ['a', 7],
        ['C', 6],
        ['c', 6],
        ['H', 1],
        ['h', 1],
        ['L', 2],
        ['l', 2],
        ['M', 2],
        ['m', 2],
        ['Q', 4],
        ['q', 4],
        ['S', 4],
        ['s', 4],
        ['T', 2],
        ['t', 2],
        ['V', 1],
        ['v', 1],
        ['Z', 0],
        ['z', 0],
    ]);
    var parse = function (path) {
        var cmd;
        var ret = [];
        var args = [];
        var curArg = '';
        var foundDecimal = false;
        var params = 0;
        for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
            var c = path_1[_i];
            if (parameters.has(c)) {
                params = parameters.get(c);
                if (cmd) {
                    // save existing command
                    if (curArg.length > 0) {
                        args[args.length] = +curArg;
                    }
                    ret[ret.length] = { cmd: cmd, args: args };
                    args = [];
                    curArg = '';
                    foundDecimal = false;
                }
                cmd = c;
            }
            else if ([' ', ','].includes(c) ||
                (c === '-' && curArg.length > 0 && curArg[curArg.length - 1] !== 'e') ||
                (c === '.' && foundDecimal)) {
                if (curArg.length === 0) {
                    continue;
                }
                if (args.length === params) {
                    // handle reused commands
                    ret[ret.length] = { cmd: cmd, args: args };
                    args = [+curArg];
                    // handle assumed commands
                    if (cmd === 'M') {
                        cmd = 'L';
                    }
                    if (cmd === 'm') {
                        cmd = 'l';
                    }
                }
                else {
                    args[args.length] = +curArg;
                }
                foundDecimal = c === '.';
                // fix for negative numbers or repeated decimals with no delimeter between commands
                curArg = ['-', '.'].includes(c) ? c : '';
            }
            else {
                curArg += c;
                if (c === '.') {
                    foundDecimal = true;
                }
            }
        }
        // add the last command
        if (curArg.length > 0) {
            if (args.length === params) {
                // handle reused commands
                ret[ret.length] = { cmd: cmd, args: args };
                args = [+curArg];
                // handle assumed commands
                if (cmd === 'M') {
                    cmd = 'L';
                }
                if (cmd === 'm') {
                    cmd = 'l';
                }
            }
            else {
                args[args.length] = +curArg;
            }
        }
        ret[ret.length] = { cmd: cmd, args: args };
        return ret;
    };
    var apply = function (commands) {
        // current point, control point, and subpath starting point
        cx = cy = px = py = sx = sy = 0;
        // run the commands
        var cmds = [];
        for (var i = 0; i < commands.length; i++) {
            var c = commands[i];
            if (c.cmd && typeof runners[c.cmd] === 'function') {
                var cmd = runners[c.cmd](c.args);
                if (Array.isArray(cmd)) {
                    cmds = cmds.concat(cmd);
                }
                else {
                    cmds.push(cmd);
                }
            }
        }
        return cmds;
    };
    var runners = {
        M: function (a) {
            cx = a[0];
            cy = a[1];
            px = py = null;
            sx = cx;
            sy = cy;
            return moveTo(cx, cy);
        },
        m: function (a) {
            cx += a[0];
            cy += a[1];
            px = py = null;
            sx = cx;
            sy = cy;
            return moveTo(cx, cy);
        },
        C: function (a) {
            cx = a[4];
            cy = a[5];
            px = a[2];
            py = a[3];
            return appendBezierCurve(a[0], a[1], a[2], a[3], a[4], a[5]);
        },
        c: function (a) {
            var cmd = appendBezierCurve(a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy, a[4] + cx, a[5] + cy);
            px = cx + a[2];
            py = cy + a[3];
            cx += a[4];
            cy += a[5];
            return cmd;
        },
        S: function (a) {
            if (px === null || py === null) {
                px = cx;
                py = cy;
            }
            var cmd = appendBezierCurve(cx - (px - cx), cy - (py - cy), a[0], a[1], a[2], a[3]);
            px = a[0];
            py = a[1];
            cx = a[2];
            cy = a[3];
            return cmd;
        },
        s: function (a) {
            if (px === null || py === null) {
                px = cx;
                py = cy;
            }
            var cmd = appendBezierCurve(cx - (px - cx), cy - (py - cy), cx + a[0], cy + a[1], cx + a[2], cy + a[3]);
            px = cx + a[0];
            py = cy + a[1];
            cx += a[2];
            cy += a[3];
            return cmd;
        },
        Q: function (a) {
            px = a[0];
            py = a[1];
            cx = a[2];
            cy = a[3];
            return appendQuadraticCurve(a[0], a[1], cx, cy);
        },
        q: function (a) {
            var cmd = appendQuadraticCurve(a[0] + cx, a[1] + cy, a[2] + cx, a[3] + cy);
            px = cx + a[0];
            py = cy + a[1];
            cx += a[2];
            cy += a[3];
            return cmd;
        },
        T: function (a) {
            if (px === null || py === null) {
                px = cx;
                py = cy;
            }
            else {
                px = cx - (px - cx);
                py = cy - (py - cy);
            }
            var cmd = appendQuadraticCurve(px, py, a[0], a[1]);
            px = cx - (px - cx);
            py = cy - (py - cy);
            cx = a[0];
            cy = a[1];
            return cmd;
        },
        t: function (a) {
            if (px === null || py === null) {
                px = cx;
                py = cy;
            }
            else {
                px = cx - (px - cx);
                py = cy - (py - cy);
            }
            var cmd = appendQuadraticCurve(px, py, cx + a[0], cy + a[1]);
            cx += a[0];
            cy += a[1];
            return cmd;
        },
        A: function (a) {
            var cmds = solveArc(cx, cy, a);
            cx = a[5];
            cy = a[6];
            return cmds;
        },
        a: function (a) {
            a[5] += cx;
            a[6] += cy;
            var cmds = solveArc(cx, cy, a);
            cx = a[5];
            cy = a[6];
            return cmds;
        },
        L: function (a) {
            cx = a[0];
            cy = a[1];
            px = py = null;
            return lineTo(cx, cy);
        },
        l: function (a) {
            cx += a[0];
            cy += a[1];
            px = py = null;
            return lineTo(cx, cy);
        },
        H: function (a) {
            cx = a[0];
            px = py = null;
            return lineTo(cx, cy);
        },
        h: function (a) {
            cx += a[0];
            px = py = null;
            return lineTo(cx, cy);
        },
        V: function (a) {
            cy = a[0];
            px = py = null;
            return lineTo(cx, cy);
        },
        v: function (a) {
            cy += a[0];
            px = py = null;
            return lineTo(cx, cy);
        },
        Z: function () {
            var cmd = closePath();
            cx = sx;
            cy = sy;
            return cmd;
        },
        z: function () {
            var cmd = closePath();
            cx = sx;
            cy = sy;
            return cmd;
        },
    };
    var solveArc = function (x, y, coords) {
        var rx = coords[0], ry = coords[1], rot = coords[2], large = coords[3], sweep = coords[4], ex = coords[5], ey = coords[6];
        var segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
        var cmds = [];
        for (var _i = 0, segs_1 = segs; _i < segs_1.length; _i++) {
            var seg = segs_1[_i];
            var bez = segmentToBezier.apply(void 0, seg);
            cmds.push(appendBezierCurve.apply(void 0, bez));
        }
        return cmds;
    };
    // from Inkscape svgtopdf, thanks!
    var arcToSegments = function (x, y, rx, ry, large, sweep, rotateX, ox, oy) {
        var th = rotateX * (Math.PI / 180);
        var sinTh = Math.sin(th);
        var cosTh = Math.cos(th);
        rx = Math.abs(rx);
        ry = Math.abs(ry);
        px = cosTh * (ox - x) * 0.5 + sinTh * (oy - y) * 0.5;
        py = cosTh * (oy - y) * 0.5 - sinTh * (ox - x) * 0.5;
        var pl = (px * px) / (rx * rx) + (py * py) / (ry * ry);
        if (pl > 1) {
            pl = Math.sqrt(pl);
            rx *= pl;
            ry *= pl;
        }
        var a00 = cosTh / rx;
        var a01 = sinTh / rx;
        var a10 = -sinTh / ry;
        var a11 = cosTh / ry;
        var x0 = a00 * ox + a01 * oy;
        var y0 = a10 * ox + a11 * oy;
        var x1 = a00 * x + a01 * y;
        var y1 = a10 * x + a11 * y;
        var d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
        var sfactorSq = 1 / d - 0.25;
        if (sfactorSq < 0) {
            sfactorSq = 0;
        }
        var sfactor = Math.sqrt(sfactorSq);
        if (sweep === large) {
            sfactor = -sfactor;
        }
        var xc = 0.5 * (x0 + x1) - sfactor * (y1 - y0);
        var yc = 0.5 * (y0 + y1) + sfactor * (x1 - x0);
        var th0 = Math.atan2(y0 - yc, x0 - xc);
        var th1 = Math.atan2(y1 - yc, x1 - xc);
        var thArc = th1 - th0;
        if (thArc < 0 && sweep === 1) {
            thArc += 2 * Math.PI;
        }
        else if (thArc > 0 && sweep === 0) {
            thArc -= 2 * Math.PI;
        }
        var segments = Math.ceil(Math.abs(thArc / (Math.PI * 0.5 + 0.001)));
        var result = [];
        for (var i = 0; i < segments; i++) {
            var th2 = th0 + (i * thArc) / segments;
            var th3 = th0 + ((i + 1) * thArc) / segments;
            result[i] = [xc, yc, th2, th3, rx, ry, sinTh, cosTh];
        }
        return result;
    };
    var segmentToBezier = function (cx1, cy1, th0, th1, rx, ry, sinTh, cosTh) {
        var a00 = cosTh * rx;
        var a01 = -sinTh * ry;
        var a10 = sinTh * rx;
        var a11 = cosTh * ry;
        var thHalf = 0.5 * (th1 - th0);
        var t = ((8 / 3) * Math.sin(thHalf * 0.5) * Math.sin(thHalf * 0.5)) /
            Math.sin(thHalf);
        var x1 = cx1 + Math.cos(th0) - t * Math.sin(th0);
        var y1 = cy1 + Math.sin(th0) + t * Math.cos(th0);
        var x3 = cx1 + Math.cos(th1);
        var y3 = cy1 + Math.sin(th1);
        var x2 = x3 + t * Math.sin(th1);
        var y2 = y3 - t * Math.cos(th1);
        var result = [
            a00 * x1 + a01 * y1,
            a10 * x1 + a11 * y1,
            a00 * x2 + a01 * y2,
            a10 * x2 + a11 * y2,
            a00 * x3 + a01 * y3,
            a10 * x3 + a11 * y3,
        ];
        return result;
    };
    var svgPathToOperators = function (path) { return apply(parse(path)); };
    //# sourceMappingURL=svgPath.js.map

    var drawLinesOfText = function (lines, options) {
        var operators = [
            beginText(),
            setFillingColor(options.color),
            setFontAndSize(options.font, options.size),
            setLineHeight(options.lineHeight),
            rotateAndSkewTextRadiansAndTranslate(toRadians(options.rotate), toRadians(options.xSkew), toRadians(options.ySkew), options.x, options.y),
        ];
        for (var idx = 0, len = lines.length; idx < len; idx++) {
            operators.push(showText(lines[idx]), nextLine());
        }
        operators.push(endText());
        return operators;
    };
    var drawImage = function (name, options) { return [
        pushGraphicsState(),
        translate(options.x, options.y),
        rotateRadians(toRadians(options.rotate)),
        scale(options.width, options.height),
        skewRadians(toRadians(options.xSkew), toRadians(options.ySkew)),
        drawObject(name),
        popGraphicsState(),
    ]; };
    var drawPage = function (name, options) { return [
        pushGraphicsState(),
        translate(options.x, options.y),
        rotateRadians(toRadians(options.rotate)),
        scale(options.xScale, options.yScale),
        skewRadians(toRadians(options.xSkew), toRadians(options.ySkew)),
        drawObject(name),
        popGraphicsState(),
    ]; };
    var drawLine = function (options) {
        return [
            pushGraphicsState(),
            options.color && setStrokingColor(options.color),
            setLineWidth(options.thickness),
            moveTo(options.start.x, options.start.y),
            lineTo(options.end.x, options.end.y),
            stroke(),
            popGraphicsState(),
        ].filter(Boolean);
    };
    var drawRectangle = function (options) {
        return [
            pushGraphicsState(),
            options.color && setFillingColor(options.color),
            options.borderColor && setStrokingColor(options.borderColor),
            setLineWidth(options.borderWidth),
            translate(options.x, options.y),
            rotateRadians(toRadians(options.rotate)),
            skewRadians(toRadians(options.xSkew), toRadians(options.ySkew)),
            moveTo(0, 0),
            lineTo(0, options.height),
            lineTo(options.width, options.height),
            lineTo(options.width, 0),
            closePath(),
            // prettier-ignore
            options.color && options.borderWidth ? fillAndStroke()
                : options.color ? fill()
                    : options.borderColor ? stroke()
                        : closePath(),
            popGraphicsState(),
        ].filter(Boolean);
    };
    var KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);
    var drawEllipsePath = function (config) {
        var x = asNumber(config.x);
        var y = asNumber(config.y);
        var xScale = asNumber(config.xScale);
        var yScale = asNumber(config.yScale);
        x -= xScale;
        y -= yScale;
        var ox = xScale * KAPPA;
        var oy = yScale * KAPPA;
        var xe = x + xScale * 2;
        var ye = y + yScale * 2;
        var xm = x + xScale;
        var ym = y + yScale;
        return [
            pushGraphicsState(),
            moveTo(x, ym),
            appendBezierCurve(x, ym - oy, xm - ox, y, xm, y),
            appendBezierCurve(xm + ox, y, xe, ym - oy, xe, ym),
            appendBezierCurve(xe, ym + oy, xm + ox, ye, xm, ye),
            appendBezierCurve(xm - ox, ye, x, ym + oy, x, ym),
            popGraphicsState(),
        ];
    };
    var drawEllipse = function (options) {
        return __spreadArrays([
            pushGraphicsState(),
            options.color && setFillingColor(options.color),
            options.borderColor && setStrokingColor(options.borderColor),
            setLineWidth(options.borderWidth)
        ], drawEllipsePath({
            x: options.x,
            y: options.y,
            xScale: options.xScale,
            yScale: options.yScale,
        }), [
            // prettier-ignore
            options.color && options.borderWidth ? fillAndStroke()
                : options.color ? fill()
                    : options.borderColor ? stroke()
                        : closePath(),
            popGraphicsState(),
        ]).filter(Boolean);
    };
    var drawSvgPath = function (path, options) {
        return __spreadArrays([
            pushGraphicsState(),
            translate(options.x, options.y),
            // SVG path Y axis is opposite pdf-lib's
            options.scale ? scale(options.scale, -options.scale) : scale(1, -1),
            options.color && setFillingColor(options.color),
            options.borderColor && setStrokingColor(options.borderColor),
            options.borderWidth && setLineWidth(options.borderWidth)
        ], svgPathToOperators(path), [
            // prettier-ignore
            options.color && options.borderWidth ? fillAndStroke()
                : options.color ? fill()
                    : options.borderColor ? stroke()
                        : closePath(),
            popGraphicsState(),
        ]).filter(Boolean);
    };
    //# sourceMappingURL=operations.js.map

    var PageSizes = {
        '4A0': [4767.87, 6740.79],
        '2A0': [3370.39, 4767.87],
        A0: [2383.94, 3370.39],
        A1: [1683.78, 2383.94],
        A2: [1190.55, 1683.78],
        A3: [841.89, 1190.55],
        A4: [595.28, 841.89],
        A5: [419.53, 595.28],
        A6: [297.64, 419.53],
        A7: [209.76, 297.64],
        A8: [147.4, 209.76],
        A9: [104.88, 147.4],
        A10: [73.7, 104.88],
        B0: [2834.65, 4008.19],
        B1: [2004.09, 2834.65],
        B2: [1417.32, 2004.09],
        B3: [1000.63, 1417.32],
        B4: [708.66, 1000.63],
        B5: [498.9, 708.66],
        B6: [354.33, 498.9],
        B7: [249.45, 354.33],
        B8: [175.75, 249.45],
        B9: [124.72, 175.75],
        B10: [87.87, 124.72],
        C0: [2599.37, 3676.54],
        C1: [1836.85, 2599.37],
        C2: [1298.27, 1836.85],
        C3: [918.43, 1298.27],
        C4: [649.13, 918.43],
        C5: [459.21, 649.13],
        C6: [323.15, 459.21],
        C7: [229.61, 323.15],
        C8: [161.57, 229.61],
        C9: [113.39, 161.57],
        C10: [79.37, 113.39],
        RA0: [2437.8, 3458.27],
        RA1: [1729.13, 2437.8],
        RA2: [1218.9, 1729.13],
        RA3: [864.57, 1218.9],
        RA4: [609.45, 864.57],
        SRA0: [2551.18, 3628.35],
        SRA1: [1814.17, 2551.18],
        SRA2: [1275.59, 1814.17],
        SRA3: [907.09, 1275.59],
        SRA4: [637.8, 907.09],
        Executive: [521.86, 756.0],
        Folio: [612.0, 936.0],
        Legal: [612.0, 1008.0],
        Letter: [612.0, 792.0],
        Tabloid: [792.0, 1224.0],
    };
    //# sourceMappingURL=sizes.js.map

    var StandardFonts;
    (function (StandardFonts) {
        StandardFonts["Courier"] = "Courier";
        StandardFonts["CourierBold"] = "Courier-Bold";
        StandardFonts["CourierOblique"] = "Courier-Oblique";
        StandardFonts["CourierBoldOblique"] = "Courier-BoldOblique";
        StandardFonts["Helvetica"] = "Helvetica";
        StandardFonts["HelveticaBold"] = "Helvetica-Bold";
        StandardFonts["HelveticaOblique"] = "Helvetica-Oblique";
        StandardFonts["HelveticaBoldOblique"] = "Helvetica-BoldOblique";
        StandardFonts["TimesRoman"] = "Times-Roman";
        StandardFonts["TimesRomanBold"] = "Times-Bold";
        StandardFonts["TimesRomanItalic"] = "Times-Italic";
        StandardFonts["TimesRomanBoldItalic"] = "Times-BoldItalic";
        StandardFonts["Symbol"] = "Symbol";
        StandardFonts["ZapfDingbats"] = "ZapfDingbats";
    })(StandardFonts || (StandardFonts = {}));
    //# sourceMappingURL=StandardFonts.js.map

    /**
     * Represents a PDF page that has been embedded in a [[PDFDocument]].
     */
    var PDFEmbeddedPage = /** @class */ (function () {
        function PDFEmbeddedPage(ref, doc, embedder) {
            this.alreadyEmbedded = false;
            assertIs(ref, 'ref', [[PDFRef, 'PDFRef']]);
            assertIs(doc, 'doc', [[PDFDocument, 'PDFDocument']]);
            assertIs(embedder, 'embedder', [[PDFPageEmbedder, 'PDFPageEmbedder']]);
            this.ref = ref;
            this.doc = doc;
            this.width = embedder.width;
            this.height = embedder.height;
            this.embedder = embedder;
        }
        /**
         * Compute the width and height of this page after being scaled by the
         * given `factor`. For example:
         * ```js
         * embeddedPage.width  // => 500
         * embeddedPage.height // => 250
         *
         * const scaled = embeddedPage.scale(0.5)
         * scaled.width  // => 250
         * scaled.height // => 125
         * ```
         * This operation is often useful before drawing a page with
         * [[PDFPage.drawPage]] to compute the `width` and `height` options.
         * @param factor The factor by which this page should be scaled.
         * @returns The width and height of the page after being scaled.
         */
        PDFEmbeddedPage.prototype.scale = function (factor) {
            assertIs(factor, 'factor', ['number']);
            return { width: this.width * factor, height: this.height * factor };
        };
        /**
         * Get the width and height of this page. For example:
         * ```js
         * const { width, height } = embeddedPage.size()
         * ```
         * @returns The width and height of the page.
         */
        PDFEmbeddedPage.prototype.size = function () {
            return this.scale(1);
        };
        /**
         * > **NOTE:** You probably don't need to call this method directly. The
         * > [[PDFDocument.save]] and [[PDFDocument.saveAsBase64]] methods will
         * > automatically ensure all embeddable pages get embedded.
         *
         * Embed this embeddable page in its document.
         *
         * @returns Resolves when the embedding is complete.
         */
        PDFEmbeddedPage.prototype.embed = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!this.alreadyEmbedded) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.embedder.embedIntoContext(this.doc.context, this.ref)];
                        case 1:
                            _a.sent();
                            this.alreadyEmbedded = true;
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * > **NOTE:** You probably don't want to call this method directly. Instead,
         * > consider using the [[PDFDocument.embedPdf]] and
         * > [[PDFDocument.embedPage]] methods, which will create instances of
         * > [[PDFEmbeddedPage]] for you.
         *
         * Create an instance of [[PDFEmbeddedPage]] from an existing ref and embedder
         *
         * @param ref The unique reference for this embedded page.
         * @param doc The document to which the embedded page will belong.
         * @param embedder The embedder that will be used to embed the page.
         */
        PDFEmbeddedPage.of = function (ref, doc, embedder) {
            return new PDFEmbeddedPage(ref, doc, embedder);
        };
        return PDFEmbeddedPage;
    }());
    //# sourceMappingURL=PDFEmbeddedPage.js.map

    /**
     * Represents a font that has been embedded in a [[PDFDocument]].
     */
    var PDFFont = /** @class */ (function () {
        function PDFFont(ref, doc, embedder) {
            this.modified = true;
            assertIs(ref, 'ref', [[PDFRef, 'PDFRef']]);
            assertIs(doc, 'doc', [[PDFDocument, 'PDFDocument']]);
            assertIs(embedder, 'embedder', [
                [CustomFontEmbedder, 'CustomFontEmbedder'],
                [StandardFontEmbedder, 'StandardFontEmbedder'],
            ]);
            this.ref = ref;
            this.doc = doc;
            this.name = embedder.fontName;
            this.embedder = embedder;
        }
        /**
         * > **NOTE:** You probably don't need to call this method directly. The
         * > [[PDFPage.drawText]] method will automatically encode the text it is
         * > given.
         *
         * Encodes a string of text in this font.
         *
         * @param text The text to be encoded.
         * @returns The encoded text as a hex string.
         */
        PDFFont.prototype.encodeText = function (text) {
            assertIs(text, 'text', ['string']);
            this.modified = true;
            return this.embedder.encodeText(text);
        };
        /**
         * Measure the width of a string of text drawn in this font at a given size.
         * For example:
         * ```js
         * const width = font.widthOfTextAtSize('Foo Bar Qux Baz', 36)
         * ```
         * @param text The string of text to be measured.
         * @param size The font size to be used for this measurement.
         * @returns The width of the string of text when drawn in this font at the
         *          given size.
         */
        PDFFont.prototype.widthOfTextAtSize = function (text, size) {
            assertIs(text, 'text', ['string']);
            assertIs(size, 'size', ['number']);
            return this.embedder.widthOfTextAtSize(text, size);
        };
        /**
         * Measure the height of this font at a given size. For example:
         * ```js
         * const height = font.heightAtSize(24)
         * ```
         * @param size The font size to be used for this measurement.
         * @returns The height of this font at the given size.
         */
        PDFFont.prototype.heightAtSize = function (size) {
            assertIs(size, 'size', ['number']);
            return this.embedder.heightOfFontAtSize(size);
        };
        /**
         * Compute the font size at which this font is a given height. For example:
         * ```js
         * const fontSize = font.sizeAtHeight(12)
         * ```
         * @param height The height to be used for this calculation.
         * @returns The font size at which this font is the given height.
         */
        PDFFont.prototype.sizeAtHeight = function (height) {
            assertIs(height, 'height', ['number']);
            return this.embedder.sizeOfFontAtHeight(height);
        };
        /**
         * Get the set of unicode code points that can be represented by this font.
         * @returns The set of unicode code points supported by this font.
         */
        PDFFont.prototype.getCharacterSet = function () {
            if (this.embedder instanceof StandardFontEmbedder) {
                // TODO: Update @pdf-lib/standard fonts to export encoding.characterSet
                return Object.keys(this.embedder.encoding.unicodeMappings)
                    .map(Number)
                    .sort(function (a, b) { return a - b; });
            }
            else {
                return this.embedder.font.characterSet;
            }
        };
        /**
         * > **NOTE:** You probably don't need to call this method directly. The
         * > [[PDFDocument.save]] and [[PDFDocument.saveAsBase64]] methods will
         * > automatically ensure all fonts get embedded.
         *
         * Embed this font in its document.
         *
         * @returns Resolves when the embedding is complete.
         */
        PDFFont.prototype.embed = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.modified) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.embedder.embedIntoContext(this.doc.context, this.ref)];
                        case 1:
                            _a.sent();
                            this.modified = false;
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * > **NOTE:** You probably don't want to call this method directly. Instead,
         * > consider using the [[PDFDocument.embedFont]] and
         * > [[PDFDocument.embedStandardFont]] methods, which will create instances
         * > of [[PDFFont]] for you.
         *
         * Create an instance of [[PDFFont]] from an existing ref and embedder
         *
         * @param ref The unique reference for this font.
         * @param doc The document to which the font will belong.
         * @param embedder The embedder that will be used to embed the font.
         */
        PDFFont.of = function (ref, doc, embedder) {
            return new PDFFont(ref, doc, embedder);
        };
        return PDFFont;
    }());
    //# sourceMappingURL=PDFFont.js.map

    /**
     * Represents an image that has been embedded in a [[PDFDocument]].
     */
    var PDFImage = /** @class */ (function () {
        function PDFImage(ref, doc, embedder) {
            this.alreadyEmbedded = false;
            assertIs(ref, 'ref', [[PDFRef, 'PDFRef']]);
            assertIs(doc, 'doc', [[PDFDocument, 'PDFDocument']]);
            assertIs(embedder, 'embedder', [
                [JpegEmbedder, 'JpegEmbedder'],
                [PngEmbedder, 'PngEmbedder'],
            ]);
            this.ref = ref;
            this.doc = doc;
            this.width = embedder.width;
            this.height = embedder.height;
            this.embedder = embedder;
        }
        /**
         * Compute the width and height of this image after being scaled by the
         * given `factor`. For example:
         * ```js
         * image.width  // => 500
         * image.height // => 250
         *
         * const scaled = image.scale(0.5)
         * scaled.width  // => 250
         * scaled.height // => 125
         * ```
         * This operation is often useful before drawing an image with
         * [[PDFPage.drawImage]] to compute the `width` and `height` options.
         * @param factor The factor by which this image should be scaled.
         * @returns The width and height of the image after being scaled.
         */
        PDFImage.prototype.scale = function (factor) {
            assertIs(factor, 'factor', ['number']);
            return { width: this.width * factor, height: this.height * factor };
        };
        /**
         * Get the width and height of this image. For example:
         * ```js
         * const { width, height } = image.size()
         * ```
         * @returns The width and height of the image.
         */
        PDFImage.prototype.size = function () {
            return this.scale(1);
        };
        /**
         * > **NOTE:** You probably don't need to call this method directly. The
         * > [[PDFDocument.save]] and [[PDFDocument.saveAsBase64]] methods will
         * > automatically ensure all images get embedded.
         *
         * Embed this image in its document.
         *
         * @returns Resolves when the embedding is complete.
         */
        PDFImage.prototype.embed = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!this.alreadyEmbedded) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.embedder.embedIntoContext(this.doc.context, this.ref)];
                        case 1:
                            _a.sent();
                            this.alreadyEmbedded = true;
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * > **NOTE:** You probably don't want to call this method directly. Instead,
         * > consider using the [[PDFDocument.embedPng]] and [[PDFDocument.embedJpg]]
         * > methods, which will create instances of [[PDFImage]] for you.
         *
         * Create an instance of [[PDFImage]] from an existing ref and embedder
         *
         * @param ref The unique reference for this image.
         * @param doc The document to which the image will belong.
         * @param embedder The embedder that will be used to embed the image.
         */
        PDFImage.of = function (ref, doc, embedder) {
            return new PDFImage(ref, doc, embedder);
        };
        return PDFImage;
    }());
    //# sourceMappingURL=PDFImage.js.map

    /**
     * Represents a single page of a [[PDFDocument]].
     */
    var PDFPage = /** @class */ (function () {
        function PDFPage(leafNode, ref, doc) {
            this.fontSize = 24;
            this.fontColor = rgb(0, 0, 0);
            this.lineHeight = 24;
            this.x = 0;
            this.y = 0;
            assertIs(leafNode, 'leafNode', [[PDFPageLeaf, 'PDFPageLeaf']]);
            assertIs(ref, 'ref', [[PDFRef, 'PDFRef']]);
            assertIs(doc, 'doc', [[PDFDocument, 'PDFDocument']]);
            this.node = leafNode;
            this.ref = ref;
            this.doc = doc;
        }
        /**
         * Rotate this page by a multiple of 90 degrees. For example:
         * ```js
         * import { degrees } from 'pdf-lib'
         *
         * page.setRotation(degrees(-90))
         * page.setRotation(degrees(0))
         * page.setRotation(degrees(90))
         * page.setRotation(degrees(180))
         * page.setRotation(degrees(270))
         * ```
         * @param angle The angle to rotate this page.
         */
        PDFPage.prototype.setRotation = function (angle) {
            var degreesAngle = toDegrees(angle);
            assertMultiple(degreesAngle, 'degreesAngle', 90);
            this.node.set(PDFName.of('Rotate'), this.doc.context.obj(degreesAngle));
        };
        /**
         * Get this page's rotation angle in degrees. For example:
         * ```js
         * const rotationAngle = page.getRotation().angle;
         * ```
         * @returns The rotation angle of the page in degrees (always a multiple of
         *          90 degrees).
         */
        PDFPage.prototype.getRotation = function () {
            var Rotate = this.node.Rotate();
            return degrees(Rotate ? Rotate.value() : 0);
        };
        /**
         * Resize this page by increasing or decreasing its width and height. For
         * example:
         * ```js
         * page.setSize(250, 500)
         * page.setSize(page.getWidth() + 50, page.getHeight() + 100)
         * page.setSize(page.getWidth() - 50, page.getHeight() - 100)
         * ```
         * @param width The new width of the page.
         * @param height The new height of the page.
         */
        PDFPage.prototype.setSize = function (width, height) {
            assertIs(width, 'width', ['number']);
            assertIs(height, 'height', ['number']);
            var mediaBox = this.node.MediaBox().clone();
            mediaBox.set(2, this.doc.context.obj(width));
            mediaBox.set(3, this.doc.context.obj(height));
            this.node.set(PDFName.of('MediaBox'), mediaBox);
        };
        /**
         * Resize this page by increasing or decreasing its width. For example:
         * ```js
         * page.setWidth(250)
         * page.setWidth(page.getWidth() + 50)
         * page.setWidth(page.getWidth() - 50)
         * ```
         * @param width The new width of the page.
         */
        PDFPage.prototype.setWidth = function (width) {
            assertIs(width, 'width', ['number']);
            this.setSize(width, this.getSize().height);
        };
        /**
         * Resize this page by increasing or decreasing its height. For example:
         * ```js
         * page.setHeight(500)
         * page.setHeight(page.getWidth() + 100)
         * page.setHeight(page.getWidth() - 100)
         * ```
         * @param height The new height of the page.
         */
        PDFPage.prototype.setHeight = function (height) {
            assertIs(height, 'height', ['number']);
            this.setSize(this.getSize().width, height);
        };
        /**
         * Get this page's width and height. For example:
         * ```js
         * const { width, height } = page.getSize()
         * ```
         * @returns The width and height of the page.
         */
        PDFPage.prototype.getSize = function () {
            var mediaBox = this.node.MediaBox();
            var width = mediaBox.lookup(2, PDFNumber).value() -
                mediaBox.lookup(0, PDFNumber).value();
            var height = mediaBox.lookup(3, PDFNumber).value() -
                mediaBox.lookup(1, PDFNumber).value();
            return { width: width, height: height };
        };
        /**
         * Get this page's width. For example:
         * ```js
         * const width = page.getWidth()
         * ```
         * @returns The width of the page.
         */
        PDFPage.prototype.getWidth = function () {
            return this.getSize().width;
        };
        /**
         * Get this page's height. For example:
         * ```js
         * const height = page.getHeight()
         * ```
         * @returns The height of the page.
         */
        PDFPage.prototype.getHeight = function () {
            return this.getSize().height;
        };
        /**
         * Translate this page's content to a new location on the page. This operation
         * is often useful after resizing the page with [[setSize]]. For example:
         * ```js
         * // Add 50 units of whitespace to the top and right of the page
         * page.setSize(page.getWidth() + 50, page.getHeight() + 50)
         *
         * // Move the page's content from the lower-left corner of the page
         * // to the top-right corner.
         * page.translateContent(50, 50)
         *
         * // Now there are 50 units of whitespace to the left and bottom of the page
         * ```
         * See also: [[resetPosition]]
         * @param x The new position on the x-axis for this page's content.
         * @param y The new position on the y-axis for this page's content.
         */
        PDFPage.prototype.translateContent = function (x, y) {
            assertIs(x, 'x', ['number']);
            assertIs(y, 'y', ['number']);
            this.node.normalize();
            this.getContentStream();
            var start = this.createContentStream(pushGraphicsState(), translate(x, y));
            var startRef = this.doc.context.register(start);
            var end = this.createContentStream(popGraphicsState());
            var endRef = this.doc.context.register(end);
            this.node.wrapContentStreams(startRef, endRef);
        };
        /**
         * Reset the x and y coordinates of this page to `(0, 0)`. This operation is
         * often useful after calling [[translateContent]]. For example:
         * ```js
         * // Shift the page's contents up and to the right by 50 units
         * page.translateContent(50, 50)
         *
         * // This text will shifted - it will be drawn at (50, 50)
         * page.drawText('I am shifted')
         *
         * // Move back to (0, 0)
         * page.resetPosition()
         *
         * // This text will not be shifted - it will be drawn at (0, 0)
         * page.drawText('I am not shifted')
         * ```
         */
        PDFPage.prototype.resetPosition = function () {
            this.getContentStream(false);
            this.x = 0;
            this.y = 0;
        };
        /**
         * Choose a default font for this page. The default font will be used whenever
         * text is drawn on this page and no font is specified. For example:
         * ```js
         * import { StandardFonts } from 'pdf-lib'
         *
         * const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
         * const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
         * const courierFont = await pdfDoc.embedFont(StandardFonts.Courier)
         *
         * const page = pdfDoc.addPage()
         *
         * page.setFont(helveticaFont)
         * page.drawText('I will be drawn in Helvetica')
         *
         * page.setFont(timesRomanFont)
         * page.drawText('I will be drawn in Courier', { font: courierFont })
         * ```
         * @param font The default font to be used when drawing text on this page.
         */
        PDFPage.prototype.setFont = function (font) {
            // TODO: Reuse image Font name if we've already added this image to Resources.Fonts
            assertIs(font, 'font', [[PDFFont, 'PDFFont']]);
            this.font = font;
            this.fontKey = addRandomSuffix(this.font.name);
            this.node.setFontDictionary(PDFName.of(this.fontKey), this.font.ref);
        };
        /**
         * Choose a default font size for this page. The default font size will be
         * used whenever text is drawn on this page and no font size is specified.
         * For example:
         * ```js
         * page.setFontSize(12)
         * page.drawText('I will be drawn in size 12')
         *
         * page.setFontSize(36)
         * page.drawText('I will be drawn in size 24', { fontSize: 24 })
         * ```
         * @param fontSize The default font size to be used when drawing text on this
         *                 page.
         */
        PDFPage.prototype.setFontSize = function (fontSize) {
            assertIs(fontSize, 'fontSize', ['number']);
            this.fontSize = fontSize;
        };
        /**
         * Choose a default font color for this page. The default font color will be
         * used whenever text is drawn on this page and no font color is specified.
         * For example:
         * ```js
         * import { rgb, cmyk, grayscale } from 'pdf-lib'
         *
         * page.setFontColor(rgb(0.97, 0.02, 0.97))
         * page.drawText('I will be drawn in pink')
         *
         * page.setFontColor(cmyk(0.4, 0.7, 0.39, 0.15))
         * page.drawText('I will be drawn in gray', { color: grayscale(0.5) })
         * ```
         * @param fontColor The default font color to be used when drawing text on
         *                  this page.
         */
        PDFPage.prototype.setFontColor = function (fontColor) {
            assertIs(fontColor, 'fontColor', [[Object, 'Color']]);
            this.fontColor = fontColor;
        };
        /**
         * Choose a default line height for this page. The default line height will be
         * used whenever text is drawn on this page and no line height is specified.
         * For example:
         * ```js
         * page.setLineHeight(12);
         * page.drawText('These lines will be vertically \n separated by 12 units')
         *
         * page.setLineHeight(36);
         * page.drawText('These lines will be vertically \n separated by 24 units', {
         *   lineHeight: 24
         * })
         * ```
         * @param lineHeight The default line height to be used when drawing text on
         *                   this page.
         */
        PDFPage.prototype.setLineHeight = function (lineHeight) {
            assertIs(lineHeight, 'lineHeight', ['number']);
            this.lineHeight = lineHeight;
        };
        /**
         * Get the default position of this page. For example:
         * ```js
         * const { x, y } = page.getPosition()
         * ```
         * @returns The default position of the page.
         */
        PDFPage.prototype.getPosition = function () {
            return { x: this.x, y: this.y };
        };
        /**
         * Get the default x coordinate of this page. For example:
         * ```js
         * const x = page.getX()
         * ```
         * @returns The default x coordinate of the page.
         */
        PDFPage.prototype.getX = function () {
            return this.x;
        };
        /**
         * Get the default y coordinate of this page. For example:
         * ```js
         * const y = page.getY()
         * ```
         * @returns The default y coordinate of the page.
         */
        PDFPage.prototype.getY = function () {
            return this.y;
        };
        /**
         * Change the default position of this page. For example:
         * ```js
         * page.moveTo(0, 0)
         * page.drawText('I will be drawn at the origin')
         *
         * page.moveTo(0, 25)
         * page.drawText('I will be drawn 25 units up')
         *
         * page.moveTo(25, 25)
         * page.drawText('I will be drawn 25 units up and 25 units to the right')
         * ```
         * @param x The new default position on the x-axis for this page.
         * @param y The new default position on the y-axis for this page.
         */
        PDFPage.prototype.moveTo = function (x, y) {
            assertIs(x, 'x', ['number']);
            assertIs(y, 'y', ['number']);
            this.x = x;
            this.y = y;
        };
        /**
         * Change the default position of this page to be further down the y-axis.
         * For example:
         * ```js
         * page.moveTo(50, 50)
         * page.drawText('I will be drawn at (50, 50)')
         *
         * page.moveDown(10)
         * page.drawText('I will be drawn at (50, 40)')
         * ```
         * @param yDecrease The amount by which the page's default position along the
         *                  y-axis should be decreased.
         */
        PDFPage.prototype.moveDown = function (yDecrease) {
            assertIs(yDecrease, 'yDecrease', ['number']);
            this.y -= yDecrease;
        };
        /**
         * Change the default position of this page to be further up the y-axis.
         * For example:
         * ```js
         * page.moveTo(50, 50)
         * page.drawText('I will be drawn at (50, 50)')
         *
         * page.moveUp(10)
         * page.drawText('I will be drawn at (50, 60)')
         * ```
         * @param yIncrease The amount by which the page's default position along the
         *                  y-axis should be increased.
         */
        PDFPage.prototype.moveUp = function (yIncrease) {
            assertIs(yIncrease, 'yIncrease', ['number']);
            this.y += yIncrease;
        };
        /**
         * Change the default position of this page to be further left on the x-axis.
         * For example:
         * ```js
         * page.moveTo(50, 50)
         * page.drawText('I will be drawn at (50, 50)')
         *
         * page.moveLeft(10)
         * page.drawText('I will be drawn at (40, 50)')
         * ```
         * @param xDecrease The amount by which the page's default position along the
         *                  x-axis should be decreased.
         */
        PDFPage.prototype.moveLeft = function (xDecrease) {
            assertIs(xDecrease, 'xDecrease', ['number']);
            this.x -= xDecrease;
        };
        /**
         * Change the default position of this page to be further right on the y-axis.
         * For example:
         * ```js
         * page.moveTo(50, 50)
         * page.drawText('I will be drawn at (50, 50)')
         *
         * page.moveRight(10)
         * page.drawText('I will be drawn at (60, 50)')
         * ```
         * @param xIncrease The amount by which the page's default position along the
         *                  x-axis should be increased.
         */
        PDFPage.prototype.moveRight = function (xIncrease) {
            assertIs(xIncrease, 'xIncrease', ['number']);
            this.x += xIncrease;
        };
        /**
         * Push one or more operators to the end of this page's current content
         * stream. For example:
         * ```js
         * import {
         *   pushGraphicsState,
         *   moveTo,
         *   lineTo,
         *   closePath,
         *   setFillingColor,
         *   rgb,
         *   fill,
         *   popGraphicsState,
         * } from 'pdf-lib'
         *
         * // Draw a green triangle in the lower-left corner of the page
         * page.pushOperators(
         *   pushGraphicsState(),
         *   moveTo(0, 0),
         *   lineTo(100, 0),
         *   lineTo(50, 100),
         *   closePath(),
         *   setFillingColor(rgb(0.0, 1.0, 0.0)),
         *   fill(),
         *   popGraphicsState(),
         * )
         * ```
         * @param operator The operators to be pushed.
         */
        PDFPage.prototype.pushOperators = function () {
            var operator = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                operator[_i] = arguments[_i];
            }
            assertEachIs(operator, 'operator', [[PDFOperator, 'PDFOperator']]);
            var contentStream = this.getContentStream();
            contentStream.push.apply(contentStream, operator);
        };
        /**
         * Draw one or more lines of text on this page. For example:
         * ```js
         * import { StandardFonts, rgb } from 'pdf-lib'
         *
         * const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
         * const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
         *
         * const page = pdfDoc.addPage()
         *
         * page.setFont(helveticaFont)
         *
         * page.moveTo(5, 200)
         * page.drawText('The Life of an Egg', { size: 36 })
         *
         * page.moveDown(36)
         * page.drawText('An Epic Tale of Woe', { size: 30 })
         *
         * page.drawText(
         *   `Humpty Dumpty sat on a wall \n` +
         *   `Humpty Dumpty had a great fall; \n` +
         *   `All the king's horses and all the king's men \n` +
         *   `Couldn't put Humpty together again. \n`,
         *   {
         *     x: 25,
         *     y: 100,
         *     font: timesRomanFont,
         *     size: 24,
         *     color: rgb(1, 0, 0),
         *     lineHeight: 24,
         *   },
         * )
         * ```
         * @param text The text to be drawn.
         * @param options The options to be used when drawing the text.
         */
        PDFPage.prototype.drawText = function (text, options) {
            if (options === void 0) { options = {}; }
            var _a, _b, _c, _d, _e, _f, _g;
            assertIs(text, 'text', ['string']);
            assertOrUndefined(options.color, 'options.color', [[Object, 'Color']]);
            assertOrUndefined(options.font, 'options.font', [[PDFFont, 'PDFFont']]);
            assertOrUndefined(options.size, 'options.size', ['number']);
            assertOrUndefined(options.rotate, 'options.rotate', [[Object, 'Rotation']]);
            assertOrUndefined(options.xSkew, 'options.xSkew', [[Object, 'Rotation']]);
            assertOrUndefined(options.ySkew, 'options.ySkew', [[Object, 'Rotation']]);
            assertOrUndefined(options.x, 'options.x', ['number']);
            assertOrUndefined(options.y, 'options.y', ['number']);
            assertOrUndefined(options.lineHeight, 'options.lineHeight', ['number']);
            assertOrUndefined(options.maxWidth, 'options.maxWidth', ['number']);
            assertOrUndefined(options.wordBreaks, 'options.wordBreaks', [Array]);
            var originalFont = this.getFont()[0];
            if (options.font)
                this.setFont(options.font);
            var _h = this.getFont(), font = _h[0], fontKey = _h[1];
            var fontSize = options.size || this.fontSize;
            var wordBreaks = options.wordBreaks || this.doc.defaultWordBreaks;
            var textWidth = function (t) { return font.widthOfTextAtSize(t, fontSize); };
            var lines = options.maxWidth === undefined
                ? cleanText(text).split(/[\r\n\f]/)
                : breakTextIntoLines(text, wordBreaks, options.maxWidth, textWidth);
            var encodedLines = new Array(lines.length);
            for (var idx = 0, len = lines.length; idx < len; idx++) {
                encodedLines[idx] = font.encodeText(lines[idx]);
            }
            var contentStream = this.getContentStream();
            contentStream.push.apply(contentStream, drawLinesOfText(encodedLines, {
                color: (_a = options.color, (_a !== null && _a !== void 0 ? _a : this.fontColor)),
                font: fontKey,
                size: fontSize,
                rotate: (_b = options.rotate, (_b !== null && _b !== void 0 ? _b : degrees(0))),
                xSkew: (_c = options.xSkew, (_c !== null && _c !== void 0 ? _c : degrees(0))),
                ySkew: (_d = options.ySkew, (_d !== null && _d !== void 0 ? _d : degrees(0))),
                x: (_e = options.x, (_e !== null && _e !== void 0 ? _e : this.x)),
                y: (_f = options.y, (_f !== null && _f !== void 0 ? _f : this.y)),
                lineHeight: (_g = options.lineHeight, (_g !== null && _g !== void 0 ? _g : this.lineHeight)),
            }));
            if (options.font)
                this.setFont(originalFont);
        };
        /**
         * Draw an image on this page. For example:
         * ```js
         * import { degrees } from 'pdf-lib'
         *
         * const jpgUrl = 'https://pdf-lib.js.org/assets/cat_riding_unicorn.jpg'
         * const jpgImageBytes = await fetch(jpgUrl).then((res) => res.arrayBuffer())
         *
         * const jpgImage = await pdfDoc.embedJpg(jpgImageBytes)
         * const jpgDims = jpgImage.scale(0.5)
         *
         * const page = pdfDoc.addPage()
         *
         * page.drawImage(jpgImage, {
         *   x: 25,
         *   y: 25,
         *   width: jpgDims.width,
         *   height: jpgDims.height,
         *   rotate: degrees(30)
         * })
         * ```
         * @param image The image to be drawn.
         * @param options The options to be used when drawing the image.
         */
        PDFPage.prototype.drawImage = function (image, options) {
            if (options === void 0) { options = {}; }
            var _a, _b, _c, _d, _e, _f, _g;
            // TODO: Reuse image XObject name if we've already added this image to Resources.XObjects
            assertIs(image, 'image', [[PDFImage, 'PDFImage']]);
            assertOrUndefined(options.x, 'options.x', ['number']);
            assertOrUndefined(options.y, 'options.y', ['number']);
            assertOrUndefined(options.width, 'options.width', ['number']);
            assertOrUndefined(options.height, 'options.height', ['number']);
            assertOrUndefined(options.rotate, 'options.rotate', [[Object, 'Rotation']]);
            assertOrUndefined(options.xSkew, 'options.xSkew', [[Object, 'Rotation']]);
            assertOrUndefined(options.ySkew, 'options.ySkew', [[Object, 'Rotation']]);
            var xObjectKey = addRandomSuffix('Image', 10);
            this.node.setXObject(PDFName.of(xObjectKey), image.ref);
            var contentStream = this.getContentStream();
            contentStream.push.apply(contentStream, drawImage(xObjectKey, {
                x: (_a = options.x, (_a !== null && _a !== void 0 ? _a : this.x)),
                y: (_b = options.y, (_b !== null && _b !== void 0 ? _b : this.y)),
                width: (_c = options.width, (_c !== null && _c !== void 0 ? _c : image.size().width)),
                height: (_d = options.height, (_d !== null && _d !== void 0 ? _d : image.size().height)),
                rotate: (_e = options.rotate, (_e !== null && _e !== void 0 ? _e : degrees(0))),
                xSkew: (_f = options.xSkew, (_f !== null && _f !== void 0 ? _f : degrees(0))),
                ySkew: (_g = options.ySkew, (_g !== null && _g !== void 0 ? _g : degrees(0))),
            }));
        };
        /**
         * Draw an embedded PDF page on this page. For example:
         * ```js
         * import { degrees } from 'pdf-lib'
         *
         * const pdfDoc = await PDFDocument.create()
         * const page = pdfDoc.addPage()
         *
         * const sourcePdfUrl = 'https://pdf-lib.js.org/assets/with_large_page_count.pdf'
         * const sourcePdf = await fetch(sourcePdfUrl).then((res) => res.arrayBuffer())
         *
         * // Embed page 74 from the PDF
         * const [embeddedPage] = await pdfDoc.embedPdf(sourcePdf, 73)
         *
         * page.drawPage(embeddedPage, {
         *   x: 250,
         *   y: 200,
         *   xScale: 0.5,
         *   yScale: 0.5,
         *   rotate: degrees(30),
         * })
         * ```
         *
         * The `options` argument accepts both `width`/`height` and `xScale`/`yScale`
         * as options. Since each of these options defines the size of the drawn page,
         * if both options are given, `width` and `height` take precedence and the
         * corresponding scale variants are ignored.
         *
         * @param embeddedPage The embedded page to be drawn.
         * @param options The options to be used when drawing the embedded page.
         */
        PDFPage.prototype.drawPage = function (embeddedPage, options) {
            if (options === void 0) { options = {}; }
            var _a, _b, _c, _d, _e;
            // TODO: Reuse embeddedPage XObject name if we've already added this embeddedPage to Resources.XObjects
            assertIs(embeddedPage, 'embeddedPage', [
                [PDFEmbeddedPage, 'PDFEmbeddedPage'],
            ]);
            assertOrUndefined(options.x, 'options.x', ['number']);
            assertOrUndefined(options.y, 'options.y', ['number']);
            assertOrUndefined(options.xScale, 'options.xScale', ['number']);
            assertOrUndefined(options.yScale, 'options.yScale', ['number']);
            assertOrUndefined(options.width, 'options.width', ['number']);
            assertOrUndefined(options.height, 'options.height', ['number']);
            assertOrUndefined(options.rotate, 'options.rotate', [[Object, 'Rotation']]);
            assertOrUndefined(options.xSkew, 'options.xSkew', [[Object, 'Rotation']]);
            assertOrUndefined(options.ySkew, 'options.ySkew', [[Object, 'Rotation']]);
            var xObjectKey = addRandomSuffix('EmbeddedPdfPage', 10);
            this.node.setXObject(PDFName.of(xObjectKey), embeddedPage.ref);
            // prettier-ignore
            var xScale = (options.width !== undefined ? options.width / embeddedPage.width
                : options.xScale !== undefined ? options.xScale
                    : 1);
            // prettier-ignore
            var yScale = (options.height !== undefined ? options.height / embeddedPage.height
                : options.yScale !== undefined ? options.yScale
                    : 1);
            var contentStream = this.getContentStream();
            contentStream.push.apply(contentStream, drawPage(xObjectKey, {
                x: (_a = options.x, (_a !== null && _a !== void 0 ? _a : this.x)),
                y: (_b = options.y, (_b !== null && _b !== void 0 ? _b : this.y)),
                xScale: xScale,
                yScale: yScale,
                rotate: (_c = options.rotate, (_c !== null && _c !== void 0 ? _c : degrees(0))),
                xSkew: (_d = options.xSkew, (_d !== null && _d !== void 0 ? _d : degrees(0))),
                ySkew: (_e = options.ySkew, (_e !== null && _e !== void 0 ? _e : degrees(0))),
            }));
        };
        /**
         * Draw an SVG path on this page. For example:
         * ```js
         * import { rgb } from 'pdf-lib'
         *
         * const svgPath = 'M 0,20 L 100,160 Q 130,200 150,120 C 190,-40 200,200 300,150 L 400,90'
         *
         * // Draw path as black line
         * page.drawSvgPath(svgPath, { x: 25, y: 75 })
         *
         * // Change border style
         * page.drawSvgPath(svgPath, {
         *   x: 25,
         *   y: 275,
         *   borderColor: rgb(0.5, 0.5, 0.5),
         *   borderWidth: 2,
         * })
         *
         * // Set fill color
         * page.drawSvgPath(svgPath, {
         * 	 x: 25,
         * 	 y: 475,
         * 	 color: rgb(1.0, 0, 0),
         * })
         *
         * // Draw 50% of original size
         * page.drawSvgPath(svgPath, {
         * 	 x: 25,
         * 	 y: 675,
         * 	 scale: 0.5,
         * })
         * ```
         * @param path The SVG path to be drawn.
         * @param options The options to be used when drawing the SVG path.
         */
        PDFPage.prototype.drawSvgPath = function (path, options) {
            if (options === void 0) { options = {}; }
            var _a, _b, _c, _d, _e;
            assertIs(path, 'path', ['string']);
            assertOrUndefined(options.x, 'options.x', ['number']);
            assertOrUndefined(options.y, 'options.y', ['number']);
            assertOrUndefined(options.scale, 'options.scale', ['number']);
            assertOrUndefined(options.borderWidth, 'options.borderWidth', ['number']);
            assertOrUndefined(options.color, 'options.color', [[Object, 'Color']]);
            assertOrUndefined(options.borderColor, 'options.borderColor', [
                [Object, 'Color'],
            ]);
            var contentStream = this.getContentStream();
            if (!('color' in options) && !('borderColor' in options)) {
                options.borderColor = rgb(0, 0, 0);
            }
            contentStream.push.apply(contentStream, drawSvgPath(path, {
                x: (_a = options.x, (_a !== null && _a !== void 0 ? _a : this.x)),
                y: (_b = options.y, (_b !== null && _b !== void 0 ? _b : this.y)),
                scale: options.scale,
                color: (_c = options.color, (_c !== null && _c !== void 0 ? _c : undefined)),
                borderColor: (_d = options.borderColor, (_d !== null && _d !== void 0 ? _d : undefined)),
                borderWidth: (_e = options.borderWidth, (_e !== null && _e !== void 0 ? _e : 0)),
            }));
        };
        /**
         * Draw a line on this page. For example:
         * ```js
         * import { rgb } from 'pdf-lib'
         *
         * page.drawLine({
         *   start: { x: 25, y: 75 },
         *   end: { x: 125, y: 175 },
         *   thickness: 2,
         *   color: rgb(0.75, 0.2, 0.2)
         * })
         * ```
         * @param options The options to be used when drawing the line.
         */
        PDFPage.prototype.drawLine = function (options) {
            var _a, _b;
            assertIs(options.start, 'options.start', [
                [Object, '{ x: number, y: number }'],
            ]);
            assertIs(options.end, 'options.end', [
                [Object, '{ x: number, y: number }'],
            ]);
            assertIs(options.start.x, 'options.start.x', ['number']);
            assertIs(options.start.y, 'options.start.y', ['number']);
            assertIs(options.end.x, 'options.end.x', ['number']);
            assertIs(options.end.y, 'options.end.y', ['number']);
            assertOrUndefined(options.thickness, 'options.thickness', ['number']);
            assertOrUndefined(options.color, 'options.color', [[Object, 'Color']]);
            var contentStream = this.getContentStream();
            if (!('color' in options)) {
                options.color = rgb(0, 0, 0);
            }
            contentStream.push.apply(contentStream, drawLine({
                start: options.start,
                end: options.end,
                thickness: (_a = options.thickness, (_a !== null && _a !== void 0 ? _a : 1)),
                color: (_b = options.color, (_b !== null && _b !== void 0 ? _b : undefined)),
            }));
        };
        /**
         * Draw a rectangle on this page. For example:
         * ```js
         * import { degrees, grayscale, rgb } from 'pdf-lib'
         *
         * page.drawRectangle({
         *   x: 25,
         *   y: 75,
         *   width: 250,
         *   height: 75,
         *   rotate: degrees(-15),
         *   borderWidth: 5,
         *   borderColor: grayscale(0.5),
         *   color: rgb(0.75, 0.2, 0.2)
         * })
         * ```
         * @param options The options to be used when drawing the rectangle.
         */
        PDFPage.prototype.drawRectangle = function (options) {
            if (options === void 0) { options = {}; }
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            assertOrUndefined(options.x, 'options.x', ['number']);
            assertOrUndefined(options.y, 'options.y', ['number']);
            assertOrUndefined(options.width, 'options.width', ['number']);
            assertOrUndefined(options.height, 'options.height', ['number']);
            assertOrUndefined(options.rotate, 'options.rotate', [[Object, 'Rotation']]);
            assertOrUndefined(options.xSkew, 'options.xSkew', [[Object, 'Rotation']]);
            assertOrUndefined(options.ySkew, 'options.ySkew', [[Object, 'Rotation']]);
            assertOrUndefined(options.borderWidth, 'options.borderWidth', ['number']);
            assertOrUndefined(options.color, 'options.color', [[Object, 'Color']]);
            assertOrUndefined(options.borderColor, 'options.borderColor', [
                [Object, 'Color'],
            ]);
            var contentStream = this.getContentStream();
            if (!('color' in options) && !('borderColor' in options)) {
                options.color = rgb(0, 0, 0);
            }
            contentStream.push.apply(contentStream, drawRectangle({
                x: (_a = options.x, (_a !== null && _a !== void 0 ? _a : this.x)),
                y: (_b = options.y, (_b !== null && _b !== void 0 ? _b : this.y)),
                width: (_c = options.width, (_c !== null && _c !== void 0 ? _c : 150)),
                height: (_d = options.height, (_d !== null && _d !== void 0 ? _d : 100)),
                rotate: (_e = options.rotate, (_e !== null && _e !== void 0 ? _e : degrees(0))),
                xSkew: (_f = options.xSkew, (_f !== null && _f !== void 0 ? _f : degrees(0))),
                ySkew: (_g = options.ySkew, (_g !== null && _g !== void 0 ? _g : degrees(0))),
                borderWidth: (_h = options.borderWidth, (_h !== null && _h !== void 0 ? _h : 0)),
                color: (_j = options.color, (_j !== null && _j !== void 0 ? _j : undefined)),
                borderColor: (_k = options.borderColor, (_k !== null && _k !== void 0 ? _k : undefined)),
            }));
        };
        /**
         * Draw a square on this page. For example:
         * ```js
         * import { degrees, grayscale, rgb } from 'pdf-lib'
         *
         * page.drawSquare({
         *   x: 25,
         *   y: 75,
         *   size: 100,
         *   rotate: degrees(-15),
         *   borderWidth: 5,
         *   borderColor: grayscale(0.5),
         *   color: rgb(0.75, 0.2, 0.2)
         * })
         * ```
         * @param options The options to be used when drawing the square.
         */
        PDFPage.prototype.drawSquare = function (options) {
            if (options === void 0) { options = {}; }
            var size = options.size;
            assertOrUndefined(size, 'size', ['number']);
            this.drawRectangle(__assign(__assign({}, options), { width: size, height: size }));
        };
        /**
         * Draw an ellipse on this page. For example:
         * ```js
         * import { grayscale, rgb } from 'pdf-lib'
         *
         * page.drawEllipse({
         *   x: 200,
         *   y: 75,
         *   xScale: 100,
         *   yScale: 50,
         *   borderWidth: 5,
         *   borderColor: grayscale(0.5),
         *   color: rgb(0.75, 0.2, 0.2)
         * })
         * ```
         * @param options The options to be used when drawing the ellipse.
         */
        PDFPage.prototype.drawEllipse = function (options) {
            if (options === void 0) { options = {}; }
            var _a, _b, _c, _d, _e, _f, _g;
            assertOrUndefined(options.x, 'options.x', ['number']);
            assertOrUndefined(options.y, 'options.y', ['number']);
            assertOrUndefined(options.xScale, 'options.xScale', ['number']);
            assertOrUndefined(options.yScale, 'options.yScale', ['number']);
            assertOrUndefined(options.color, 'options.color', [[Object, 'Color']]);
            assertOrUndefined(options.borderColor, 'options.borderColor', [
                [Object, 'Color'],
            ]);
            assertOrUndefined(options.borderWidth, 'options.borderWidth', ['number']);
            var contentStream = this.getContentStream();
            if (!('color' in options) && !('borderColor' in options)) {
                options.color = rgb(0, 0, 0);
            }
            contentStream.push.apply(contentStream, drawEllipse({
                x: (_a = options.x, (_a !== null && _a !== void 0 ? _a : this.x)),
                y: (_b = options.y, (_b !== null && _b !== void 0 ? _b : this.y)),
                xScale: (_c = options.xScale, (_c !== null && _c !== void 0 ? _c : 100)),
                yScale: (_d = options.yScale, (_d !== null && _d !== void 0 ? _d : 100)),
                color: (_e = options.color, (_e !== null && _e !== void 0 ? _e : undefined)),
                borderColor: (_f = options.borderColor, (_f !== null && _f !== void 0 ? _f : undefined)),
                borderWidth: (_g = options.borderWidth, (_g !== null && _g !== void 0 ? _g : 0)),
            }));
        };
        /**
         * Draw a circle on this page. For example:
         * ```js
         * import { grayscale, rgb } from 'pdf-lib'
         *
         * page.drawCircle({
         *   x: 200,
         *   y: 150,
         *   size: 100,
         *   borderWidth: 5,
         *   borderColor: grayscale(0.5),
         *   color: rgb(0.75, 0.2, 0.2)
         * })
         * ```
         * @param options The options to be used when drawing the ellipse.
         */
        PDFPage.prototype.drawCircle = function (options) {
            if (options === void 0) { options = {}; }
            var size = options.size;
            assertOrUndefined(size, 'size', ['number']);
            this.drawEllipse(__assign(__assign({}, options), { xScale: size, yScale: size }));
        };
        PDFPage.prototype.getFont = function () {
            if (!this.font || !this.fontKey) {
                var font = this.doc.embedStandardFont(StandardFonts.Helvetica);
                this.setFont(font);
            }
            return [this.font, this.fontKey];
        };
        PDFPage.prototype.getContentStream = function (useExisting) {
            if (useExisting === void 0) { useExisting = true; }
            if (useExisting && this.contentStream)
                return this.contentStream;
            this.contentStream = this.createContentStream();
            this.contentStreamRef = this.doc.context.register(this.contentStream);
            this.node.addContentStream(this.contentStreamRef);
            return this.contentStream;
        };
        PDFPage.prototype.createContentStream = function () {
            var operators = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                operators[_i] = arguments[_i];
            }
            var dict = this.doc.context.obj({});
            var contentStream = PDFContentStream.of(dict, operators);
            return contentStream;
        };
        /**
         * > **NOTE:** You probably don't want to call this method directly. Instead,
         * > consider using the [[PDFDocument.addPage]] and [[PDFDocument.insertPage]]
         * > methods, which can create instances of [[PDFPage]] for you.
         *
         * Create an instance of [[PDFPage]] from an existing leaf node.
         *
         * @param leafNode The leaf node to be wrapped.
         * @param ref The unique reference for the page.
         * @param doc The document to which the page will belong.
         */
        PDFPage.of = function (leafNode, ref, doc) {
            return new PDFPage(leafNode, ref, doc);
        };
        /**
         * > **NOTE:** You probably don't want to call this method directly. Instead,
         * > consider using the [[PDFDocument.addPage]] and [[PDFDocument.insertPage]]
         * > methods, which can create instances of [[PDFPage]] for you.
         *
         * Create an instance of [[PDFPage]].
         *
         * @param doc The document to which the page will belong.
         */
        PDFPage.create = function (doc) {
            assertIs(doc, 'doc', [[PDFDocument, 'PDFDocument']]);
            var dummyRef = PDFRef.of(-1);
            var pageLeaf = PDFPageLeaf.withContextAndParent(doc.context, dummyRef);
            var pageRef = doc.context.register(pageLeaf);
            return new PDFPage(pageLeaf, pageRef, doc);
        };
        return PDFPage;
    }());
    //# sourceMappingURL=PDFPage.js.map

    var ParseSpeeds;
    (function (ParseSpeeds) {
        ParseSpeeds[ParseSpeeds["Fastest"] = Infinity] = "Fastest";
        ParseSpeeds[ParseSpeeds["Fast"] = 1500] = "Fast";
        ParseSpeeds[ParseSpeeds["Medium"] = 500] = "Medium";
        ParseSpeeds[ParseSpeeds["Slow"] = 100] = "Slow";
    })(ParseSpeeds || (ParseSpeeds = {}));
    /**
     * Represents a PDF document.
     */
    var PDFDocument = /** @class */ (function () {
        function PDFDocument(context, ignoreEncryption) {
            var _this = this;
            /** The default word breaks used in PDFPage.drawText */
            this.defaultWordBreaks = [' '];
            this.computePages = function () {
                var pages = [];
                _this.catalog.Pages().traverse(function (node, ref) {
                    if (node instanceof PDFPageLeaf) {
                        var page = _this.pageMap.get(node);
                        if (!page) {
                            page = PDFPage.of(node, ref, _this);
                            _this.pageMap.set(node, page);
                        }
                        pages.push(page);
                    }
                });
                return pages;
            };
            assertIs(context, 'context', [[PDFContext, 'PDFContext']]);
            assertIs(ignoreEncryption, 'ignoreEncryption', ['boolean']);
            this.context = context;
            this.catalog = context.lookup(context.trailerInfo.Root);
            this.isEncrypted = !!context.lookup(context.trailerInfo.Encrypt);
            this.pageCache = Cache.populatedBy(this.computePages);
            this.pageMap = new Map();
            this.fonts = [];
            this.images = [];
            this.embeddedPages = [];
            if (!ignoreEncryption && this.isEncrypted)
                throw new EncryptedPDFError();
            this.updateInfoDict();
        }
        /**
         * Load an existing [[PDFDocument]]. The input data can be provided in
         * multiple formats:
         *
         * | Type          | Contents                                               |
         * | ------------- | ------------------------------------------------------ |
         * | `string`      | A base64 encoded string (or data URI) containing a PDF |
         * | `Uint8Array`  | The raw bytes of a PDF                                 |
         * | `ArrayBuffer` | The raw bytes of a PDF                                 |
         *
         * For example:
         * ```js
         * import { PDFDocument } from 'pdf-lib'
         *
         * // pdf=string
         * const base64 =
         *  'JVBERi0xLjcKJYGBgYEKCjUgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUKL0xlbm' +
         *  'd0aCAxMDQKPj4Kc3RyZWFtCniccwrhMlAAwaJ0Ln2P1Jyy1JLM5ERdc0MjCwUjE4WQNC4Q' +
         *  '6cNlCFZkqGCqYGSqEJLLZWNuYGZiZmbkYuZsZmlmZGRgZmluDCQNzc3NTM2NzdzMXMxMjQ' +
         *  'ztFEKyuEK0uFxDuAAOERdVCmVuZHN0cmVhbQplbmRvYmoKCjYgMCBvYmoKPDwKL0ZpbHRl' +
         *  'ciAvRmxhdGVEZWNvZGUKL1R5cGUgL09ialN0bQovTiA0Ci9GaXJzdCAyMAovTGVuZ3RoID' +
         *  'IxNQo+PgpzdHJlYW0KeJxVj9GqwjAMhu/zFHkBzTo3nCCCiiKIHPEICuJF3cKoSCu2E8/b' +
         *  '20wPIr1p8v9/8kVhgilmGfawX2CGaVrgcAi0/bsy0lrX7IGWpvJ4iJYEN3gEmrrGBlQwGs' +
         *  'HHO9VBX1wNrxAqMX87RBD5xpJuddqwd82tjAHxzV1U5LPgy52DKXWnr1Lheg+j/c/pzGVr' +
         *  'iqV0VlwZPXGPCJjElw/ybkwUmeoWgxesDXGhHJC/D/iikp1Av80ptKU0FdBEe25pPihAM1' +
         *  'u6ytgaaWfs2Hrz35CJT1+EWmAKZW5kc3RyZWFtCmVuZG9iagoKNyAwIG9iago8PAovU2l6' +
         *  'ZSA4Ci9Sb290IDIgMCBSCi9GaWx0ZXIgL0ZsYXRlRGVjb2RlCi9UeXBlIC9YUmVmCi9MZW' +
         *  '5ndGggMzgKL1cgWyAxIDIgMiBdCi9JbmRleCBbIDAgOCBdCj4+CnN0cmVhbQp4nBXEwREA' +
         *  'EBAEsCwz3vrvRmOOyyOoGhZdutHN2MT55fIAVocD+AplbmRzdHJlYW0KZW5kb2JqCgpzdG' +
         *  'FydHhyZWYKNTEwCiUlRU9G'
         *
         * const dataUri = 'data:application/pdf;base64,' + base64
         *
         * const pdfDoc1 = await PDFDocument.load(base64)
         * const pdfDoc2 = await PDFDocument.load(dataUri)
         *
         * // pdf=Uint8Array
         * import fs from 'fs'
         * const uint8Array = fs.readFileSync('with_update_sections.pdf')
         * const pdfDoc3 = await PDFDocument.load(uint8Array)
         *
         * // pdf=ArrayBuffer
         * const url = 'https://pdf-lib.js.org/assets/with_update_sections.pdf'
         * const arrayBuffer = await fetch(url).then(res => res.arrayBuffer())
         * const pdfDoc4 = await PDFDocument.load(arrayBuffer)
         *
         * ```
         *
         * @param pdf The input data containing a PDF document.
         * @param options The options to be used when loading the document.
         * @returns Resolves with a document loaded from the input.
         */
        PDFDocument.load = function (pdf, options) {
            if (options === void 0) { options = {}; }
            return __awaiter(this, void 0, void 0, function () {
                var _a, ignoreEncryption, _b, parseSpeed, _c, throwOnInvalidObject, bytes, context;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = options.ignoreEncryption, ignoreEncryption = _a === void 0 ? false : _a, _b = options.parseSpeed, parseSpeed = _b === void 0 ? ParseSpeeds.Slow : _b, _c = options.throwOnInvalidObject, throwOnInvalidObject = _c === void 0 ? false : _c;
                            assertIs(pdf, 'pdf', ['string', Uint8Array, ArrayBuffer]);
                            assertIs(ignoreEncryption, 'ignoreEncryption', ['boolean']);
                            assertIs(parseSpeed, 'parseSpeed', ['number']);
                            assertIs(throwOnInvalidObject, 'throwOnInvalidObject', ['boolean']);
                            bytes = toUint8Array(pdf);
                            return [4 /*yield*/, PDFParser.forBytesWithOptions(bytes, parseSpeed, throwOnInvalidObject).parseDocument()];
                        case 1:
                            context = _d.sent();
                            return [2 /*return*/, new PDFDocument(context, ignoreEncryption)];
                    }
                });
            });
        };
        /**
         * Create a new [[PDFDocument]].
         * @returns Resolves with the newly created document.
         */
        PDFDocument.create = function () {
            return __awaiter(this, void 0, void 0, function () {
                var context, pageTree, pageTreeRef, catalog;
                return __generator(this, function (_a) {
                    context = PDFContext.create();
                    pageTree = PDFPageTree.withContext(context);
                    pageTreeRef = context.register(pageTree);
                    catalog = PDFCatalog.withContextAndPages(context, pageTreeRef);
                    context.trailerInfo.Root = context.register(catalog);
                    return [2 /*return*/, new PDFDocument(context, false)];
                });
            });
        };
        /**
         * Register a fontkit instance. This must be done before custom fonts can
         * be embedded. See [here](https://github.com/Hopding/pdf-lib/tree/Rewrite#fontkit-installation)
         * for instructions on how to install and register a fontkit instance.
         *
         * > You do **not** need to call this method to embed standard fonts.
         *
         * @param fontkit The fontkit instance to be registered.
         */
        PDFDocument.prototype.registerFontkit = function (fontkit) {
            this.fontkit = fontkit;
        };
        /**
         * Set this document's title metadata. The title will appear in the
         * "Document Properties" section of most PDF readers. For example:
         * ```js
         * pdfDoc.setTitle('🥚 The Life of an Egg 🍳')
         * ```
         * @param title The title of this document.
         */
        PDFDocument.prototype.setTitle = function (title) {
            assertIs(title, 'title', ['string']);
            var key = PDFName.of('Title');
            this.getInfoDict().set(key, PDFHexString.fromText(title));
        };
        /**
         * Set this document's author metadata. The author will appear in the
         * "Document Properties" section of most PDF readers. For example:
         * ```js
         * pdfDoc.setAuthor('Humpty Dumpty')
         * ```
         * @param author The author of this document.
         */
        PDFDocument.prototype.setAuthor = function (author) {
            assertIs(author, 'author', ['string']);
            var key = PDFName.of('Author');
            this.getInfoDict().set(key, PDFHexString.fromText(author));
        };
        /**
         * Set this document's subject metadata. The subject will appear in the
         * "Document Properties" section of most PDF readers. For example:
         * ```js
         * pdfDoc.setSubject('📘 An Epic Tale of Woe 📖')
         * ```
         * @param subject The subject of this document.
         */
        PDFDocument.prototype.setSubject = function (subject) {
            assertIs(subject, 'author', ['string']);
            var key = PDFName.of('Subject');
            this.getInfoDict().set(key, PDFHexString.fromText(subject));
        };
        /**
         * Set this document's keyword metadata. These keywords will appear in the
         * "Document Properties" section of most PDF readers. For example:
         * ```js
         * pdfDoc.setKeywords(['eggs', 'wall', 'fall', 'king', 'horses', 'men'])
         * ```
         * @param keywords An array of keywords associated with this document.
         */
        PDFDocument.prototype.setKeywords = function (keywords) {
            assertIs(keywords, 'keywords', [Array]);
            var key = PDFName.of('Keywords');
            this.getInfoDict().set(key, PDFHexString.fromText(keywords.join(' ')));
        };
        /**
         * Set this document's creator metadata. The creator will appear in the
         * "Document Properties" section of most PDF readers. For example:
         * ```js
         * pdfDoc.setCreator('PDF App 9000 🤖')
         * ```
         * @param creator The creator of this document.
         */
        PDFDocument.prototype.setCreator = function (creator) {
            assertIs(creator, 'creator', ['string']);
            var key = PDFName.of('Creator');
            this.getInfoDict().set(key, PDFHexString.fromText(creator));
        };
        /**
         * Set this document's producer metadata. The producer will appear in the
         * "Document Properties" section of most PDF readers. For example:
         * ```js
         * pdfDoc.setProducer('PDF App 9000 🤖')
         * ```
         * @param producer The producer of this document.
         */
        PDFDocument.prototype.setProducer = function (producer) {
            assertIs(producer, 'creator', ['string']);
            var key = PDFName.of('Producer');
            this.getInfoDict().set(key, PDFHexString.fromText(producer));
        };
        /**
         * Set this document's language metadata. The language will appear in the
         * "Document Properties" section of some PDF readers. For example:
         * ```js
         * pdfDoc.setLanguage('en-us')
         * ```
         *
         * @param language An RFC 3066 _Language-Tag_ denoting the language of this
         *                 document, or an empty string if the language is unknown.
         */
        PDFDocument.prototype.setLanguage = function (language) {
            assertIs(language, 'language', ['string']);
            var key = PDFName.of('Lang');
            this.catalog.set(key, PDFString.of(language));
        };
        /**
         * Set this document's creation date metadata. The creation date will appear
         * in the "Document Properties" section of most PDF readers. For example:
         * ```js
         * pdfDoc.setCreationDate(new Date())
         * ```
         * @param creationDate The date this document was created.
         */
        PDFDocument.prototype.setCreationDate = function (creationDate) {
            assertIs(creationDate, 'creationDate', [[Date, 'Date']]);
            var key = PDFName.of('CreationDate');
            this.getInfoDict().set(key, PDFString.fromDate(creationDate));
        };
        /**
         * Set this document's modification date metadata. The modification date will
         * appear in the "Document Properties" section of most PDF readers. For
         * example:
         * ```js
         * pdfDoc.setModificationDate(new Date())
         * ```
         * @param modificationDate The date this document was last modified.
         */
        PDFDocument.prototype.setModificationDate = function (modificationDate) {
            assertIs(modificationDate, 'modificationDate', [[Date, 'Date']]);
            var key = PDFName.of('ModDate');
            this.getInfoDict().set(key, PDFString.fromDate(modificationDate));
        };
        /**
         * Get the number of pages contained in this document. For example:
         * ```js
         * const totalPages = pdfDoc.getPageCount()
         * ```
         * @returns The number of pages in this document.
         */
        PDFDocument.prototype.getPageCount = function () {
            if (this.pageCount === undefined)
                this.pageCount = this.getPages().length;
            return this.pageCount;
        };
        /**
         * Get an array of all the pages contained in this document. The pages are
         * stored in the array in the same order that they are rendered in the
         * document. For example:
         * ```js
         * const pages = pdfDoc.getPages()
         * pages[0]   // The first page of the document
         * pages[2]   // The third page of the document
         * pages[197] // The 198th page of the document
         * ```
         * @returns An array of all the pages contained in this document.
         */
        PDFDocument.prototype.getPages = function () {
            return this.pageCache.access();
        };
        /**
         * Get an array of indices for all the pages contained in this document. The
         * array will contain a range of integers from
         * `0..pdfDoc.getPageCount() - 1`. For example:
         * ```js
         * const pdfDoc = await PDFDocument.create()
         * pdfDoc.addPage()
         * pdfDoc.addPage()
         * pdfDoc.addPage()
         *
         * const indices = pdfDoc.getPageIndices()
         * indices // => [0, 1, 2]
         * ```
         * @returns An array of indices for all pages contained in this document.
         */
        PDFDocument.prototype.getPageIndices = function () {
            return range(0, this.getPageCount());
        };
        /**
         * Remove the page at a given index from this document. For example:
         * ```js
         * pdfDoc.removePage(0)   // Remove the first page of the document
         * pdfDoc.removePage(2)   // Remove the third page of the document
         * pdfDoc.removePage(197) // Remove the 198th page of the document
         * ```
         * Once a page has been removed, it will no longer be rendered at that index
         * in the document.
         * @param index The index of the page to be removed.
         */
        PDFDocument.prototype.removePage = function (index) {
            var pageCount = this.getPageCount();
            if (this.pageCount === 0)
                throw new RemovePageFromEmptyDocumentError();
            assertRange(index, 'index', 0, pageCount - 1);
            this.catalog.removeLeafNode(index);
            this.pageCount = pageCount - 1;
        };
        /**
         * Add a page to the end of this document. This method accepts three
         * different value types for the `page` parameter:
         *
         * | Type               | Behavior                                                                            |
         * | ------------------ | ----------------------------------------------------------------------------------- |
         * | `undefined`        | Create a new page and add it to the end of this document                            |
         * | `[number, number]` | Create a new page with the given dimensions and add it to the end of this document  |
         * | `PDFPage`          | Add the existing page to the end of this document                                   |
         *
         * For example:
         * ```js
         * // page=undefined
         * const newPage = pdfDoc.addPage()
         *
         * // page=[number, number]
         * import { PageSizes } from 'pdf-lib'
         * const newPage1 = pdfDoc.addPage(PageSizes.A7)
         * const newPage2 = pdfDoc.addPage(PageSizes.Letter)
         * const newPage3 = pdfDoc.addPage([500, 750])
         *
         * // page=PDFPage
         * const pdfDoc1 = await PDFDocument.create()
         * const pdfDoc2 = await PDFDocument.load(...)
         * const [existingPage] = await pdfDoc1.copyPages(pdfDoc2, [0])
         * pdfDoc1.addPage(existingPage)
         * ```
         *
         * @param page Optionally, the desired dimensions or existing page.
         * @returns The newly created (or existing) page.
         */
        PDFDocument.prototype.addPage = function (page) {
            assertIs(page, 'page', ['undefined', [PDFPage, 'PDFPage'], Array]);
            return this.insertPage(this.getPageCount(), page);
        };
        /**
         * Insert a page at a given index within this document. This method accepts
         * three different value types for the `page` parameter:
         *
         * | Type               | Behavior                                                                       |
         * | ------------------ | ------------------------------------------------------------------------------ |
         * | `undefined`        | Create a new page and insert it into this document                             |
         * | `[number, number]` | Create a new page with the given dimensions and insert it into this document   |
         * | `PDFPage`          | Insert the existing page into this document                                    |
         *
         * For example:
         * ```js
         * // page=undefined
         * const newPage = pdfDoc.insertPage(2)
         *
         * // page=[number, number]
         * import { PageSizes } from 'pdf-lib'
         * const newPage1 = pdfDoc.insertPage(2, PageSizes.A7)
         * const newPage2 = pdfDoc.insertPage(0, PageSizes.Letter)
         * const newPage3 = pdfDoc.insertPage(198, [500, 750])
         *
         * // page=PDFPage
         * const pdfDoc1 = await PDFDocument.create()
         * const pdfDoc2 = await PDFDocument.load(...)
         * const [existingPage] = await pdfDoc1.copyPages(pdfDoc2, [0])
         * pdfDoc1.insertPage(0, existingPage)
         * ```
         *
         * @param index The index at which the page should be inserted (zero-based).
         * @param page Optionally, the desired dimensions or existing page.
         * @returns The newly created (or existing) page.
         */
        PDFDocument.prototype.insertPage = function (index, page) {
            var pageCount = this.getPageCount();
            assertRange(index, 'index', 0, pageCount);
            assertIs(page, 'page', ['undefined', [PDFPage, 'PDFPage'], Array]);
            if (!page || Array.isArray(page)) {
                var dims = Array.isArray(page) ? page : PageSizes.A4;
                page = PDFPage.create(this);
                page.setSize.apply(page, dims);
            }
            else if (page.doc !== this) {
                throw new ForeignPageError();
            }
            var parentRef = this.catalog.insertLeafNode(page.ref, index);
            page.node.setParent(parentRef);
            this.pageMap.set(page.node, page);
            this.pageCache.invalidate();
            this.pageCount = pageCount + 1;
            return page;
        };
        /**
         * Copy pages from a source document into this document. Allows pages to be
         * copied between different [[PDFDocument]] instances. For example:
         * ```js
         * const pdfDoc = await PDFDocument.create()
         * const srcDoc = await PDFDocument.load(...)
         *
         * const copiedPages = await pdfDoc.copyPages(srcDoc, [0, 3, 89])
         * const [firstPage, fourthPage, ninetiethPage] = copiedPages;
         *
         * pdfDoc.addPage(fourthPage)
         * pdfDoc.insertPage(0, ninetiethPage)
         * pdfDoc.addPage(firstPage)
         * ```
         * @param srcDoc The document from which pages should be copied.
         * @param indices The indices of the pages that should be copied.
         * @returns Resolves with an array of pages copied into this document.
         */
        PDFDocument.prototype.copyPages = function (srcDoc, indices) {
            return __awaiter(this, void 0, void 0, function () {
                var copier, srcPages, copiedPages, idx, len, srcPage, copiedPage, ref;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            assertIs(srcDoc, 'srcDoc', [[PDFDocument, 'PDFDocument']]);
                            assertIs(indices, 'indices', [Array]);
                            return [4 /*yield*/, srcDoc.flush()];
                        case 1:
                            _a.sent();
                            copier = PDFObjectCopier.for(srcDoc.context, this.context);
                            srcPages = srcDoc.getPages();
                            copiedPages = new Array(indices.length);
                            for (idx = 0, len = indices.length; idx < len; idx++) {
                                srcPage = srcPages[indices[idx]];
                                copiedPage = copier.copy(srcPage.node);
                                ref = this.context.register(copiedPage);
                                copiedPages[idx] = PDFPage.of(copiedPage, ref, this);
                            }
                            return [2 /*return*/, copiedPages];
                    }
                });
            });
        };
        /**
         * Embed a font into this document. The input data can be provided in multiple
         * formats:
         *
         * | Type            | Contents                                                |
         * | --------------- | ------------------------------------------------------- |
         * | `StandardFonts` | One of the standard 14 fonts                            |
         * | `string`        | A base64 encoded string (or data URI) containing a font |
         * | `Uint8Array`    | The raw bytes of a font                                 |
         * | `ArrayBuffer`   | The raw bytes of a font                                 |
         *
         * For example:
         * ```js
         * // font=StandardFonts
         * import { StandardFonts } from 'pdf-lib'
         * const font1 = await pdfDoc.embedFont(StandardFonts.Helvetica)
         *
         * // font=string
         * const font2 = await pdfDoc.embedFont('AAEAAAAVAQAABABQRFNJRx/upe...')
         * const font3 = await pdfDoc.embedFont('data:font/opentype;base64,AAEAAA...')
         *
         * // font=Uint8Array
         * import fs from 'fs'
         * const font4 = await pdfDoc.embedFont(fs.readFileSync('Ubuntu-R.ttf'))
         *
         * // font=ArrayBuffer
         * const url = 'https://pdf-lib.js.org/assets/ubuntu/Ubuntu-R.ttf'
         * const ubuntuBytes = await fetch(url).then(res => res.arrayBuffer())
         * const font5 = await pdfDoc.embedFont(ubuntuBytes)
         * ```
         * See also: [[registerFontkit]]
         * @param font The input data for a font.
         * @param options The options to be used when embedding the font.
         * @returns Resolves with the embedded font.
         */
        PDFDocument.prototype.embedFont = function (font, options) {
            if (options === void 0) { options = {}; }
            return __awaiter(this, void 0, void 0, function () {
                var _a, subset, embedder, bytes, fontkit, _b, ref, pdfFont;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = options.subset, subset = _a === void 0 ? false : _a;
                            assertIs(font, 'font', ['string', Uint8Array, ArrayBuffer]);
                            assertIs(subset, 'subset', ['boolean']);
                            if (!isStandardFont(font)) return [3 /*break*/, 1];
                            embedder = StandardFontEmbedder.for(font);
                            return [3 /*break*/, 7];
                        case 1:
                            if (!canBeConvertedToUint8Array(font)) return [3 /*break*/, 6];
                            bytes = toUint8Array(font);
                            fontkit = this.assertFontkit();
                            if (!subset) return [3 /*break*/, 3];
                            return [4 /*yield*/, CustomFontSubsetEmbedder.for(fontkit, bytes)];
                        case 2:
                            _b = _c.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, CustomFontEmbedder.for(fontkit, bytes)];
                        case 4:
                            _b = _c.sent();
                            _c.label = 5;
                        case 5:
                            embedder = _b;
                            return [3 /*break*/, 7];
                        case 6: throw new TypeError('`font` must be one of `StandardFonts | string | Uint8Array | ArrayBuffer`');
                        case 7:
                            ref = this.context.nextRef();
                            pdfFont = PDFFont.of(ref, this, embedder);
                            this.fonts.push(pdfFont);
                            return [2 /*return*/, pdfFont];
                    }
                });
            });
        };
        /**
         * Embed a standard font into this document.
         * For example:
         * ```js
         * import { StandardFonts } from 'pdf-lib'
         * const helveticaFont = pdfDoc.embedFont(StandardFonts.Helvetica)
         * ```
         * @param font The standard font to be embedded.
         * @returns The embedded font.
         */
        PDFDocument.prototype.embedStandardFont = function (font) {
            assertIs(font, 'font', ['string']);
            if (!isStandardFont(font)) {
                throw new TypeError('`font` must be one of type `StandardFontsr`');
            }
            var embedder = StandardFontEmbedder.for(font);
            var ref = this.context.nextRef();
            var pdfFont = PDFFont.of(ref, this, embedder);
            this.fonts.push(pdfFont);
            return pdfFont;
        };
        /**
         * Embed a JPEG image into this document. The input data can be provided in
         * multiple formats:
         *
         * | Type          | Contents                                                      |
         * | ------------- | ------------------------------------------------------------- |
         * | `string`      | A base64 encoded string (or data URI) containing a JPEG image |
         * | `Uint8Array`  | The raw bytes of a JPEG image                                 |
         * | `ArrayBuffer` | The raw bytes of a JPEG image                                 |
         *
         * For example:
         * ```js
         * // jpg=string
         * const image1 = await pdfDoc.embedJpg('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...')
         * const image2 = await pdfDoc.embedJpg('data:image/jpeg;base64,/9j/4AAQ...')
         *
         * // jpg=Uint8Array
         * import fs from 'fs'
         * const uint8Array = fs.readFileSync('cat_riding_unicorn.jpg')
         * const image3 = await pdfDoc.embedJpg(uint8Array)
         *
         * // jpg=ArrayBuffer
         * const url = 'https://pdf-lib.js.org/assets/cat_riding_unicorn.jpg'
         * const arrayBuffer = await fetch(url).then(res => res.arrayBuffer())
         * const image4 = await pdfDoc.embedJpg(arrayBuffer)
         * ```
         *
         * @param jpg The input data for a JPEG image.
         * @returns Resolves with the embedded image.
         */
        PDFDocument.prototype.embedJpg = function (jpg) {
            return __awaiter(this, void 0, void 0, function () {
                var bytes, embedder, ref, pdfImage;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            assertIs(jpg, 'jpg', ['string', Uint8Array, ArrayBuffer]);
                            bytes = toUint8Array(jpg);
                            return [4 /*yield*/, JpegEmbedder.for(bytes)];
                        case 1:
                            embedder = _a.sent();
                            ref = this.context.nextRef();
                            pdfImage = PDFImage.of(ref, this, embedder);
                            this.images.push(pdfImage);
                            return [2 /*return*/, pdfImage];
                    }
                });
            });
        };
        /**
         * Embed a PNG image into this document. The input data can be provided in
         * multiple formats:
         *
         * | Type          | Contents                                                     |
         * | ------------- | ------------------------------------------------------------ |
         * | `string`      | A base64 encoded string (or data URI) containing a PNG image |
         * | `Uint8Array`  | The raw bytes of a PNG image                                 |
         * | `ArrayBuffer` | The raw bytes of a PNG image                                 |
         *
         * For example:
         * ```js
         * // png=string
         * const image1 = await pdfDoc.embedPng('iVBORw0KGgoAAAANSUhEUgAAAlgAAAF3...')
         * const image2 = await pdfDoc.embedPng('data:image/png;base64,iVBORw0KGg...')
         *
         * // png=Uint8Array
         * import fs from 'fs'
         * const uint8Array = fs.readFileSync('small_mario.png')
         * const image3 = await pdfDoc.embedPng(uint8Array)
         *
         * // png=ArrayBuffer
         * const url = 'https://pdf-lib.js.org/assets/small_mario.png'
         * const arrayBuffer = await fetch(url).then(res => res.arrayBuffer())
         * const image4 = await pdfDoc.embedPng(arrayBuffer)
         * ```
         *
         * @param png The input data for a PNG image.
         * @returns Resolves with the embedded image.
         */
        PDFDocument.prototype.embedPng = function (png) {
            return __awaiter(this, void 0, void 0, function () {
                var bytes, embedder, ref, pdfImage;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            assertIs(png, 'png', ['string', Uint8Array, ArrayBuffer]);
                            bytes = toUint8Array(png);
                            return [4 /*yield*/, PngEmbedder.for(bytes)];
                        case 1:
                            embedder = _a.sent();
                            ref = this.context.nextRef();
                            pdfImage = PDFImage.of(ref, this, embedder);
                            this.images.push(pdfImage);
                            return [2 /*return*/, pdfImage];
                    }
                });
            });
        };
        /**
         * Embed one or more PDF pages into this document.
         *
         * For example:
         * ```js
         * const pdfDoc = await PDFDocument.create()
         *
         * const sourcePdfUrl = 'https://pdf-lib.js.org/assets/with_large_page_count.pdf'
         * const sourcePdf = await fetch(sourcePdfUrl).then((res) => res.arrayBuffer())
         *
         * // Embed page 74 of `sourcePdf` into `pdfDoc`
         * const [embeddedPage] = await pdfDoc.embedPdf(sourcePdf, [73])
         * ```
         *
         * See [[PDFDocument.load]] for examples of the allowed input data formats.
         *
         * @param pdf The input data containing a PDF document.
         * @param indices The indices of the pages that should be embedded.
         * @returns Resolves with an array of the embedded pages.
         */
        PDFDocument.prototype.embedPdf = function (pdf, indices) {
            if (indices === void 0) { indices = [0]; }
            return __awaiter(this, void 0, void 0, function () {
                var srcDoc, _a, srcPages;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            assertIs(pdf, 'pdf', [
                                'string',
                                Uint8Array,
                                ArrayBuffer,
                                [PDFDocument, 'PDFDocument'],
                            ]);
                            assertIs(indices, 'indices', [Array]);
                            if (!(pdf instanceof PDFDocument)) return [3 /*break*/, 1];
                            _a = pdf;
                            return [3 /*break*/, 3];
                        case 1: return [4 /*yield*/, PDFDocument.load(pdf)];
                        case 2:
                            _a = _b.sent();
                            _b.label = 3;
                        case 3:
                            srcDoc = _a;
                            srcPages = pluckIndices(srcDoc.getPages(), indices);
                            return [2 /*return*/, this.embedPages(srcPages)];
                    }
                });
            });
        };
        /**
         * Embed a single PDF page into this document.
         *
         * For example:
         * ```js
         * const pdfDoc = await PDFDocument.create()
         *
         * const sourcePdfUrl = 'https://pdf-lib.js.org/assets/with_large_page_count.pdf'
         * const sourceBuffer = await fetch(sourcePdfUrl).then((res) => res.arrayBuffer())
         * const sourcePdfDoc = await PDFDocument.load(sourceBuffer)
         * const sourcePdfPage = sourcePdfDoc.getPages()[73]
         *
         * const embeddedPage = await pdfDoc.embedPage(
         *   sourcePdfPage,
         *
         *   // Clip a section of the source page so that we only embed part of it
         *   { left: 100, right: 450, bottom: 330, top: 570 },
         *
         *   // Translate all drawings of the embedded page by (10, 200) units
         *   [1, 0, 0, 1, 10, 200],
         * )
         * ```
         *
         * @param page The page to be embedded.
         * @param boundingBox
         * Optionally, an area of the source page that should be embedded
         * (defaults to entire page).
         * @param transformationMatrix
         * Optionally, a transformation matrix that is always applied to the embedded
         * page anywhere it is drawn.
         * @returns Resolves with the embedded pdf page.
         */
        PDFDocument.prototype.embedPage = function (page, boundingBox, transformationMatrix) {
            return __awaiter(this, void 0, void 0, function () {
                var embeddedPage;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            assertIs(page, 'page', [[PDFPage, 'PDFPage']]);
                            return [4 /*yield*/, this.embedPages([page], [boundingBox], [transformationMatrix])];
                        case 1:
                            embeddedPage = (_a.sent())[0];
                            return [2 /*return*/, embeddedPage];
                    }
                });
            });
        };
        /**
         * Embed one or more PDF pages into this document.
         *
         * For example:
         * ```js
         * const pdfDoc = await PDFDocument.create()
         *
         * const sourcePdfUrl = 'https://pdf-lib.js.org/assets/with_large_page_count.pdf'
         * const sourceBuffer = await fetch(sourcePdfUrl).then((res) => res.arrayBuffer())
         * const sourcePdfDoc = await PDFDocument.load(sourceBuffer)
         *
         * const page1 = sourcePdfDoc.getPages()[0]
         * const page2 = sourcePdfDoc.getPages()[52]
         * const page3 = sourcePdfDoc.getPages()[73]
         *
         * const embeddedPages = await pdfDoc.embedPages([page1, page2, page3])
         * ```
         *
         * @param page
         * The pages to be embedded (they must all share the same context).
         * @param boundingBoxes
         * Optionally, an array of clipping boundaries - one for each page
         * (defaults to entirety of each page).
         * @param transformationMatrices
         * Optionally, an array of transformation matrices - one for each page
         * (each page's transformation will apply anywhere it is drawn).
         * @returns Resolves with an array of the embedded pdf pages.
         */
        PDFDocument.prototype.embedPages = function (pages, boundingBoxes, transformationMatrices) {
            if (boundingBoxes === void 0) { boundingBoxes = []; }
            if (transformationMatrices === void 0) { transformationMatrices = []; }
            return __awaiter(this, void 0, void 0, function () {
                var idx, len, currPage, nextPage, context, maybeCopyPage, embeddedPages, idx, len, page, box, matrix, embedder, ref;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (pages.length === 0)
                                return [2 /*return*/, []];
                            // Assert all pages have the same context
                            for (idx = 0, len = pages.length - 1; idx < len; idx++) {
                                currPage = pages[idx];
                                nextPage = pages[idx + 1];
                                if (currPage.node.context !== nextPage.node.context) {
                                    throw new PageEmbeddingMismatchedContextError();
                                }
                            }
                            context = pages[0].node.context;
                            maybeCopyPage = context === this.context
                                ? function (p) { return p; }
                                : PDFObjectCopier.for(context, this.context).copy;
                            embeddedPages = new Array(pages.length);
                            idx = 0, len = pages.length;
                            _b.label = 1;
                        case 1:
                            if (!(idx < len)) return [3 /*break*/, 4];
                            page = maybeCopyPage(pages[idx].node);
                            box = boundingBoxes[idx];
                            matrix = transformationMatrices[idx];
                            return [4 /*yield*/, PDFPageEmbedder.for(page, box, matrix)];
                        case 2:
                            embedder = _b.sent();
                            ref = this.context.nextRef();
                            embeddedPages[idx] = PDFEmbeddedPage.of(ref, this, embedder);
                            _b.label = 3;
                        case 3:
                            idx++;
                            return [3 /*break*/, 1];
                        case 4:
                            (_a = this.embeddedPages).push.apply(_a, embeddedPages);
                            return [2 /*return*/, embeddedPages];
                    }
                });
            });
        };
        /**
         * > **NOTE:** You shouldn't need to call this method directly. The [[save]]
         * > and [[saveAsBase64]] methods will automatically ensure that all embedded
         * > assets are flushed before serializing the document.
         *
         * Flush all embedded fonts, PDF pages, and images to this document's
         * [[context]].
         *
         * @returns Resolves when the flush is complete.
         */
        PDFDocument.prototype.flush = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.embedAll(this.fonts)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.embedAll(this.images)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.embedAll(this.embeddedPages)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Serialize this document to an array of bytes making up a PDF file.
         * For example:
         * ```js
         * const pdfBytes = await pdfDoc.save()
         * ```
         *
         * There are a number of things you can do with the serialized document,
         * depending on the JavaScript environment you're running in:
         * * Write it to a file in Node or React Native
         * * Download it as a Blob in the browser
         * * Render it in an `iframe`
         *
         * @param options The options to be used when saving the document.
         * @returns Resolves with the bytes of the serialized document.
         */
        PDFDocument.prototype.save = function (options) {
            if (options === void 0) { options = {}; }
            return __awaiter(this, void 0, void 0, function () {
                var _a, useObjectStreams, _b, addDefaultPage, _c, objectsPerTick, Writer;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = options.useObjectStreams, useObjectStreams = _a === void 0 ? true : _a, _b = options.addDefaultPage, addDefaultPage = _b === void 0 ? true : _b, _c = options.objectsPerTick, objectsPerTick = _c === void 0 ? 50 : _c;
                            assertIs(useObjectStreams, 'useObjectStreams', ['boolean']);
                            assertIs(addDefaultPage, 'addDefaultPage', ['boolean']);
                            assertIs(objectsPerTick, 'objectsPerTick', ['number']);
                            if (addDefaultPage && this.getPageCount() === 0)
                                this.addPage();
                            return [4 /*yield*/, this.flush()];
                        case 1:
                            _d.sent();
                            Writer = useObjectStreams ? PDFStreamWriter : PDFWriter;
                            return [2 /*return*/, Writer.forContext(this.context, objectsPerTick).serializeToBuffer()];
                    }
                });
            });
        };
        /**
         * Serialize this document to a base64 encoded string or data URI making up a
         * PDF file. For example:
         * ```js
         * const base64String = await pdfDoc.saveAsBase64()
         * base64String // => 'JVBERi0xLjcKJYGBgYEKC...'
         *
         * const base64DataUri = await pdfDoc.saveAsBase64({ dataUri: true })
         * base64DataUri // => 'data:application/pdf;base64,JVBERi0xLjcKJYGBgYEKC...'
         * ```
         *
         * @param options The options to be used when saving the document.
         * @returns Resolves with a base64 encoded string or data URI of the
         *          serialized document.
         */
        PDFDocument.prototype.saveAsBase64 = function (options) {
            if (options === void 0) { options = {}; }
            return __awaiter(this, void 0, void 0, function () {
                var _a, dataUri, otherOptions, bytes, base64;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = options.dataUri, dataUri = _a === void 0 ? false : _a, otherOptions = __rest(options, ["dataUri"]);
                            assertIs(dataUri, 'dataUri', ['boolean']);
                            return [4 /*yield*/, this.save(otherOptions)];
                        case 1:
                            bytes = _b.sent();
                            base64 = encodeToBase64(bytes);
                            return [2 /*return*/, dataUri ? "data:application/pdf;base64," + base64 : base64];
                    }
                });
            });
        };
        PDFDocument.prototype.embedAll = function (embeddables) {
            return __awaiter(this, void 0, void 0, function () {
                var idx, len;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            idx = 0, len = embeddables.length;
                            _a.label = 1;
                        case 1:
                            if (!(idx < len)) return [3 /*break*/, 4];
                            return [4 /*yield*/, embeddables[idx].embed()];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            idx++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        PDFDocument.prototype.updateInfoDict = function () {
            var pdfLib = "pdf-lib (https://github.com/Hopding/pdf-lib)";
            var now = new Date();
            var info = this.getInfoDict();
            this.setProducer(pdfLib);
            this.setModificationDate(now);
            if (!info.get(PDFName.of('Creator')))
                this.setCreator(pdfLib);
            if (!info.get(PDFName.of('CreationDate')))
                this.setCreationDate(now);
        };
        PDFDocument.prototype.getInfoDict = function () {
            var existingInfo = this.context.lookup(this.context.trailerInfo.Info);
            if (existingInfo instanceof PDFDict)
                return existingInfo;
            var newInfo = this.context.obj({});
            this.context.trailerInfo.Info = this.context.register(newInfo);
            return newInfo;
        };
        PDFDocument.prototype.assertFontkit = function () {
            if (!this.fontkit)
                throw new FontkitNotRegisteredError();
            return this.fontkit;
        };
        return PDFDocument;
    }());
    //# sourceMappingURL=PDFDocument.js.map

    // import QRCode from 'qrcode';

    function idealFontSize(font, text, maxWidth, minSize, defaultSize) {
      let currentSize = defaultSize;
      let textWidth = font.widthOfTextAtSize(text, defaultSize);
      while (textWidth > maxWidth && currentSize > minSize) {
        textWidth = font.widthOfTextAtSize(text, --currentSize);
      }
      return textWidth > maxWidth ? null : currentSize;
    }

    function drawText(page, font, text, x, y, size = 11) {
      page.drawText(text || '', { x, y, size, font });
    }

    async function generatePdf(profile, settings) {
      const baseTime = new Date();
      baseTime.setMinutes(baseTime.getMinutes() - settings.createdXMinutesAgo);
      const creationDate = baseTime.toLocaleDateString("fr-FR");
      const creationHour = baseTime
        .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        .replace(":", "h");

      const {
        prenom,
        nom,
        dateDeNaissance,
        lieuDeNaissance,
        addresse,
        ville,
        codePostal
      } = profile;
      const existingPdfBytes = await fetch("covid-19/certificate.pdf").then(res => 
        res.arrayBuffer()
      );
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page1 = pdfDoc.getPages()[0];
      drawText(page1, font, `${prenom} ${nom}`, 123, 686);
      drawText(page1, font, dateDeNaissance, 123, 661);
      drawText(page1, font, lieuDeNaissance, 92, 638);
      drawText(page1, font, `${addresse} ${codePostal} ${ville}`, 134, 613);
      drawText(page1, font, ...settings.selectedReason.position);
      drawText(page1, font, 
        profile.ville,
        111,
        226,
        idealFontSize(font, profile.ville, 83, 7, 11) || 7
      );
      drawText(page1, font, creationDate, 92, 200);
      drawText(page1, font, creationHour.substring(0, 2), 200, 201);
      drawText(page1, font, creationHour.substring(3, 5), 220, 201);
      drawText(page1, font, "Date de création:", 464, 150, 7);
      drawText(page1, font, `${creationDate} à ${creationHour}`, 455, 144, 7);

      const dataForQrCode = [
        `Cree le: ${creationDate} a ${creationHour}`,
        `Nom: ${nom}`,
        `Prenom: ${prenom}`,
        `Naissance: ${dateDeNaissance} a ${lieuDeNaissance}`,
        `Adresse: ${addresse} ${codePostal} ${ville}`,
        `Sortie: ${creationDate} a ${creationHour}`,
        `Motif: ${settings.selectedReason.shortText}`
      ].join("; ");
      // const generatedQR = await generateQR(dataForQrCode);
      // const qrImage = await pdfDoc.embedPng(generatedQR);
      // page1.drawImage(qrImage, {
      //   x: page1.getWidth() - 170,
      //   y: 155,
      //   width: 100,
      //   height: 100
      // });

      // pdfDoc.addPage();

      // const page2 = pdfDoc.getPages()[1];
      // page2.drawImage(qrImage, {
      //   x: 50,
      //   y: page2.getHeight() - 350,
      //   width: 300,
      //   height: 300
      // });

      const pdfBytes = await pdfDoc.save();

      return new Blob([pdfBytes], { type: "application/pdf" });
    }

    const guid = () => {
      const s4 = () =>
        Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      return (
        s4() +
        s4() +
        "-" +
        s4() +
        "-" +
        s4() +
        "-" +
        s4() +
        "-" +
        s4() +
        s4() +
        s4()
      );
    };

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (66:6) {#each $profiles as profile}
    function create_each_block_2(ctx) {
    	let a;
    	let i0;
    	let t0;
    	let t1_value = /*profile*/ ctx[20].prenom + "";
    	let t1;
    	let t2;
    	let t3_value = /*profile*/ ctx[20].nom + "";
    	let t3;
    	let t4;
    	let button;
    	let i1;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[7](/*profile*/ ctx[20], ...args);
    	}

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[8](/*profile*/ ctx[20], ...args);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			i0 = element("i");
    			t0 = text("\n            ");
    			t1 = text(t1_value);
    			t2 = space();
    			t3 = text(t3_value);
    			t4 = space();
    			button = element("button");
    			i1 = element("i");
    			attr_dev(i0, "class", "fas fa-user");
    			add_location(i0, file, 71, 10, 2178);
    			attr_dev(i1, "class", "fas fa-times");
    			add_location(i1, file, 76, 12, 2404);
    			attr_dev(button, "class", "btn btn-light btn-sm float-right");
    			add_location(button, file, 73, 10, 2262);
    			attr_dev(a, "href", "javascript:void(0)");
    			attr_dev(a, "class", "list-group-item list-group-item-action");
    			toggle_class(a, "active", /*profile*/ ctx[20].selected);
    			add_location(a, file, 66, 8, 1979);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, a, anchor);
    			append_dev(a, i0);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    			append_dev(a, t3);
    			append_dev(a, t4);
    			append_dev(a, button);
    			append_dev(button, i1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button, "click", stop_propagation(click_handler), false, false, true),
    				listen_dev(a, "click", click_handler_1, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$profiles*/ 4 && t1_value !== (t1_value = /*profile*/ ctx[20].prenom + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$profiles*/ 4 && t3_value !== (t3_value = /*profile*/ ctx[20].nom + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*$profiles*/ 4) {
    				toggle_class(a, "active", /*profile*/ ctx[20].selected);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(66:6) {#each $profiles as profile}",
    		ctx
    	});

    	return block;
    }

    // (90:4) {#if createProfileWindow}
    function create_if_block_1(ctx) {
    	let div1;
    	let form;
    	let t0;
    	let div0;
    	let button;
    	let dispose;
    	let each_value_1 = profileSchema;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			form = element("form");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Enregistrer";
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-outline-primary margin-top center-block svelte-esamuq");
    			add_location(button, file, 101, 12, 3148);
    			attr_dev(div0, "class", "text-center");
    			add_location(div0, file, 100, 10, 3110);
    			add_location(form, file, 91, 8, 2784);
    			add_location(div1, file, 90, 6, 2770);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, form);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(form, null);
    			}

    			append_dev(form, t0);
    			append_dev(form, div0);
    			append_dev(div0, button);
    			if (remount) dispose();
    			dispose = listen_dev(form, "submit", prevent_default(/*handleNewProfile*/ ctx[5]), false, true, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*profileSchema, newProfile*/ 2) {
    				each_value_1 = profileSchema;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(form, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(90:4) {#if createProfileWindow}",
    		ctx
    	});

    	return block;
    }

    // (93:10) {#each profileSchema as field}
    function create_each_block_1(ctx) {
    	let input;
    	let input_placeholder_value;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[10].call(input, /*field*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "class", "form-control margin-top svelte-esamuq");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", input_placeholder_value = /*field*/ ctx[17].value);
    			input.required = true;
    			add_location(input, file, 93, 12, 2888);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*newProfile*/ ctx[1][/*field*/ ctx[17].key]);
    			if (remount) dispose();
    			dispose = listen_dev(input, "input", input_input_handler);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*newProfile, profileSchema*/ 2 && input.value !== /*newProfile*/ ctx[1][/*field*/ ctx[17].key]) {
    				set_input_value(input, /*newProfile*/ ctx[1][/*field*/ ctx[17].key]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(93:10) {#each profileSchema as field}",
    		ctx
    	});

    	return block;
    }

    // (114:4) {#if $profiles.find(p => p.selected)}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let br0;
    	let t1;
    	let label;
    	let t2;
    	let t3_value = /*$settings*/ ctx[3].createdXMinutesAgo + "";
    	let t3;
    	let t4;
    	let t5_value = (/*$settings*/ ctx[3].createdXMinutesAgo > 1 ? "s" : "") + "";
    	let t5;
    	let t6;
    	let input;
    	let t7;
    	let br1;
    	let t8;
    	let br2;
    	let t9;
    	let button;
    	let i;
    	let t10;
    	let dispose;
    	let each_value = reasons;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			br0 = element("br");
    			t1 = space();
    			label = element("label");
    			t2 = text("Attestation créée il y a ");
    			t3 = text(t3_value);
    			t4 = text(" minute");
    			t5 = text(t5_value);
    			t6 = space();
    			input = element("input");
    			t7 = space();
    			br1 = element("br");
    			t8 = space();
    			br2 = element("br");
    			t9 = space();
    			button = element("button");
    			i = element("i");
    			t10 = text("\n          Générer l'attestation");
    			attr_dev(div, "class", "list-group");
    			add_location(div, file, 114, 6, 3420);
    			add_location(br0, file, 130, 6, 3943);
    			attr_dev(label, "for", "created-since");
    			add_location(label, file, 131, 6, 3956);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "class", "custom-range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", "60");
    			attr_dev(input, "step", "1");
    			attr_dev(input, "id", "created-since");
    			add_location(input, file, 134, 6, 4121);
    			add_location(br1, file, 142, 6, 4314);
    			add_location(br2, file, 143, 6, 4327);
    			attr_dev(i, "class", "fas fa-file-pdf");
    			add_location(i, file, 148, 8, 4514);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-outline-primary btn-lg btn-block");
    			add_location(button, file, 144, 6, 4340);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, label, anchor);
    			append_dev(label, t2);
    			append_dev(label, t3);
    			append_dev(label, t4);
    			append_dev(label, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*$settings*/ ctx[3].createdXMinutesAgo);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(button, t10);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "change", /*input_change_input_handler*/ ctx[12]),
    				listen_dev(input, "input", /*input_change_input_handler*/ ctx[12]),
    				listen_dev(button, "click", /*click_handler_4*/ ctx[13], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeReason, $settings, reasons, settings*/ 8) {
    				each_value = reasons;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*$settings*/ 8 && t3_value !== (t3_value = /*$settings*/ ctx[3].createdXMinutesAgo + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$settings*/ 8 && t5_value !== (t5_value = (/*$settings*/ ctx[3].createdXMinutesAgo > 1 ? "s" : "") + "")) set_data_dev(t5, t5_value);

    			if (dirty & /*$settings*/ 8) {
    				set_input_value(input, /*$settings*/ ctx[3].createdXMinutesAgo);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(button);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(114:4) {#if $profiles.find(p => p.selected)}",
    		ctx
    	});

    	return block;
    }

    // (116:8) {#each reasons as reason}
    function create_each_block(ctx) {
    	let a;
    	let i;
    	let i_class_value;
    	let t0;
    	let t1_value = /*reason*/ ctx[14].shortText + "";
    	let t1;
    	let t2;
    	let dispose;

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[11](/*reason*/ ctx[14], ...args);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			i = element("i");
    			t0 = text("\n              ");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(i, "class", i_class_value = "fas fa-" + /*reason*/ ctx[14].faIcon + " svelte-esamuq");
    			add_location(i, file, 124, 12, 3817);
    			attr_dev(a, "href", "javascript:void(0)");
    			attr_dev(a, "class", "list-group-item list-group-item-action");
    			toggle_class(a, "active", activeReason(/*$settings*/ ctx[3].selectedReason, /*reason*/ ctx[14]));
    			add_location(a, file, 116, 10, 3489);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, a, anchor);
    			append_dev(a, i);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    			if (remount) dispose();
    			dispose = listen_dev(a, "click", click_handler_3, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*activeReason, $settings, reasons*/ 8) {
    				toggle_class(a, "active", activeReason(/*$settings*/ ctx[3].selectedReason, /*reason*/ ctx[14]));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(116:8) {#each reasons as reason}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div1;
    	let div0;
    	let t0;
    	let a;
    	let i;
    	let t1;
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let show_if = /*$profiles*/ ctx[2].find(func);
    	let dispose;
    	let each_value_2 = /*$profiles*/ ctx[2];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block0 = /*createProfileWindow*/ ctx[0] && create_if_block_1(ctx);
    	let if_block1 = show_if && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			a = element("a");
    			i = element("i");
    			t1 = text("\n          Nouveau profil");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			br = element("br");
    			t4 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(i, "class", "fas fa-plus");
    			add_location(i, file, 84, 8, 2655);
    			attr_dev(a, "href", "javascript:void(0)");
    			attr_dev(a, "class", "list-group-item list-group-item-action");
    			add_location(a, file, 80, 6, 2484);
    			attr_dev(div0, "class", "list-group");
    			add_location(div0, file, 64, 4, 1911);
    			add_location(br, file, 111, 4, 3364);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file, 62, 2, 1856);
    			attr_dev(main, "class", "svelte-esamuq");
    			add_location(main, file, 61, 0, 1847);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t0);
    			append_dev(div0, a);
    			append_dev(a, i);
    			append_dev(a, t1);
    			append_dev(div1, t2);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t3);
    			append_dev(div1, br);
    			append_dev(div1, t4);
    			if (if_block1) if_block1.m(div1, null);
    			if (remount) dispose();
    			dispose = listen_dev(a, "click", /*click_handler_2*/ ctx[9], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$profiles, selectProfile, deleteProfile*/ 84) {
    				each_value_2 = /*$profiles*/ ctx[2];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (/*createProfileWindow*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div1, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*$profiles*/ 4) show_if = /*$profiles*/ ctx[2].find(func);

    			if (show_if) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function activeReason(selectedReason, reason) {
    	return selectedReason && reason.shortText === selectedReason.shortText;
    }

    async function generate(profile, settings) {
    	const pdfBlob = await generatePdf(profile, settings);
    	downloadBlob(pdfBlob, `attestation.pdf`);
    }

    function downloadBlob(blob, fileName) {
    	const link = document.createElement("a");
    	var url = URL.createObjectURL(blob);
    	link.href = url;
    	link.download = fileName;
    	document.body.appendChild(link);
    	link.click();
    }

    const func = p => p.selected;

    function instance($$self, $$props, $$invalidate) {
    	let $profiles;
    	let $settings;
    	validate_store(profiles, "profiles");
    	component_subscribe($$self, profiles, $$value => $$invalidate(2, $profiles = $$value));
    	validate_store(settings, "settings");
    	component_subscribe($$self, settings, $$value => $$invalidate(3, $settings = $$value));
    	profiles.useLocalStorage();
    	settings.useLocalStorage();
    	let createProfileWindow = false;
    	let newProfile = { id: guid() };

    	function selectProfile(profile) {
    		const newProfiles = [...$profiles].map(p => ({ ...p, selected: false }));
    		const selectedProfileIndex = newProfiles.findIndex(p => p.id === profile.id);
    		newProfiles[selectedProfileIndex].selected = true;
    		profiles.update(() => newProfiles);
    	}

    	function handleNewProfile() {
    		const oldProfiles = [...$profiles].map(p => ({ ...p, selected: false }));
    		const newProfiles = [...oldProfiles, { ...newProfile, selected: true }];
    		profiles.update(() => newProfiles);
    		$$invalidate(0, createProfileWindow = false);
    		$$invalidate(1, newProfile = { id: guid() });
    	}

    	function deleteProfile(profile) {
    		const tempProfiles = $profiles;
    		const index = tempProfiles.findIndex(p => p.id === profile.id);
    		tempProfiles.splice(index, 1);
    		profiles.update(() => tempProfiles);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = profile => deleteProfile(profile);
    	const click_handler_1 = profile => selectProfile(profile);
    	const click_handler_2 = () => $$invalidate(0, createProfileWindow = !createProfileWindow);

    	function input_input_handler(field) {
    		newProfile[field.key] = this.value;
    		$$invalidate(1, newProfile);
    	}

    	const click_handler_3 = reason => settings.update(() => ({ ...$settings, selectedReason: reason }));

    	function input_change_input_handler() {
    		$settings.createdXMinutesAgo = to_number(this.value);
    		settings.set($settings);
    	}

    	const click_handler_4 = () => generate($profiles.find(p => p.selected), $settings);

    	$$self.$capture_state = () => ({
    		reasons,
    		profileSchema,
    		writable,
    		profiles,
    		settings,
    		generatePdf,
    		guid,
    		createProfileWindow,
    		newProfile,
    		activeReason,
    		selectProfile,
    		handleNewProfile,
    		deleteProfile,
    		generate,
    		downloadBlob,
    		$profiles,
    		$settings
    	});

    	$$self.$inject_state = $$props => {
    		if ("createProfileWindow" in $$props) $$invalidate(0, createProfileWindow = $$props.createProfileWindow);
    		if ("newProfile" in $$props) $$invalidate(1, newProfile = $$props.newProfile);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		createProfileWindow,
    		newProfile,
    		$profiles,
    		$settings,
    		selectProfile,
    		handleNewProfile,
    		deleteProfile,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input_input_handler,
    		click_handler_3,
    		input_change_input_handler,
    		click_handler_4
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
