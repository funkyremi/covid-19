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
  selectedReason: {
    shortText: "Sport",
    text: `Déplacements brefs, dans la limite d'une heure quotidienne et dans un rayon maximal d'un kilomètre autour du domicile, liés soit à l'activité physique individuelle des personnes, à l'exclusion de toute pratique sportive collective et de toute proximité avec d'autres personnes, soit à la promenade avec les seules personnes regroupées dans un même domicile, soit aux besoins des animaux de compagnie.`,
    position: ["x", 76, 345, 19]
  }
});
