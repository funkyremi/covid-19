import { writable } from "svelte/store";
import { reasons } from './data';

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

export const profiles = createWritableStore("profiles", []);
export const settings = createWritableStore("settings", {
  createdXMinutesAgo: 30,
  selectedReason: reasons[4]
});
