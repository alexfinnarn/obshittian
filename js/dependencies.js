/**
 * Centralized external library dependency management.
 *
 * This module provides a unified way to wait for external libraries loaded via CDN.
 * All libraries dispatch a '{name}-ready' event when loaded (configured in index.html).
 *
 * Usage:
 *   import { whenReady, whenAllReady } from './dependencies.js';
 *
 *   // Wait for a single library
 *   const marked = await whenReady('marked');
 *
 *   // Wait for all libraries before initializing app
 *   await whenAllReady();
 *   initApp();
 *
 * Adding a new library:
 *   1. Add script tag to index.html with onload handler that dispatches '{name}-ready' event
 *   2. Add entry to `libs` object below with appropriate timeout
 *   3. Access via whenReady('name') or it will be included in whenAllReady()
 */

// Library configuration
// Add new external dependencies here with their timeout values
const libs = {
    CM: { timeout: 10000 },        // CodeMirror - larger due to multiple module imports
    Pikaday: { timeout: 5000 },    // Calendar widget
    marked: { timeout: 5000 },     // Markdown parser
    Fuse: { timeout: 5000 },       // Fuzzy search
    docx: { timeout: 5000 }        // Word document generation for sync
};

/**
 * Wait for a single library to be ready.
 *
 * @param {string} libName - Name of the library (must match window property and event name)
 * @returns {Promise<any>} Resolves with the library object, rejects on timeout
 */
export function whenReady(libName) {
    return new Promise((resolve, reject) => {
        const config = libs[libName];
        if (!config) {
            reject(new Error(`Unknown library: ${libName}. Add it to the libs config in dependencies.js`));
            return;
        }

        // Already loaded
        if (typeof window[libName] !== 'undefined') {
            resolve(window[libName]);
            return;
        }

        // Set up timeout
        const timeoutId = setTimeout(() => {
            window.removeEventListener(`${libName.toLowerCase()}-ready`, handler);
            reject(new Error(`Timeout waiting for ${libName} to load (${config.timeout}ms)`));
        }, config.timeout);

        // Listen for ready event
        function handler() {
            clearTimeout(timeoutId);
            if (typeof window[libName] !== 'undefined') {
                resolve(window[libName]);
            } else {
                reject(new Error(`${libName}-ready event fired but window.${libName} is undefined`));
            }
        }

        window.addEventListener(`${libName.toLowerCase()}-ready`, handler, { once: true });
    });
}

/**
 * Wait for all configured libraries to be ready.
 *
 * @returns {Promise<Object>} Resolves with object containing all libraries keyed by name
 * @throws {Error} If any library fails to load within its timeout
 */
export function whenAllReady() {
    const libNames = Object.keys(libs);
    const promises = libNames.map(name =>
        whenReady(name).then(lib => ({ name, lib }))
    );

    return Promise.all(promises).then(results => {
        const libraries = {};
        for (const { name, lib } of results) {
            libraries[name] = lib;
        }
        return libraries;
    });
}

/**
 * Check if a library is currently loaded.
 * Useful for conditional logic without waiting.
 *
 * @param {string} libName - Name of the library
 * @returns {boolean} True if the library is available on window
 */
export function isLoaded(libName) {
    return typeof window[libName] !== 'undefined';
}

/**
 * Get list of all configured library names.
 *
 * @returns {string[]} Array of library names
 */
export function getLibraryNames() {
    return Object.keys(libs);
}
