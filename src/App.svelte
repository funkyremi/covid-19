<script>
  import { reasons, profileSchema } from './data';
  import { writable } from "svelte/store";
  import { profiles, settings } from "./stores";
  import { generatePdf } from "./pdf";
  import { guid } from "./utils"

  let createProfileWindow = false;
  let userSettings;
  let newProfile = { id: guid() };

  profiles.useLocalStorage();
  profiles.subscribe(value => {});
  settings.useLocalStorage();
  settings.subscribe(value => {
    userSettings = value;
  });
  
  function activeProfile(profile) {
    return profile.selected;
  }
  function activeReason(selectedReason, reason) {
    return selectedReason && reason.shortText === selectedReason.shortText;
  }
  function selectProfile(profile) {
    const newProfiles = [...$profiles].map(p => ({...p, selected: false}));
    const selectedProfileIndex = newProfiles.findIndex(p => p.id === profile.id);
    newProfiles[selectedProfileIndex].selected = true;
    profiles.update(() => newProfiles);
  }
  function handleNewProfile() {
    const oldProfiles = [...$profiles].map(p => ({...p, selected: false}));
    const newProfiles = [...oldProfiles, {...newProfile, selected: true}];
    profiles.update(() => newProfiles);
    createProfileWindow = false;
    newProfile = { id: guid() };
  }
  function deleteProfile(profile) {
    const tempProfiles = $profiles;
    const index = tempProfiles.findIndex(p => p.id === profile.id);
    tempProfiles.splice(index, 1);
    profiles.update(() => tempProfiles);
  }
</script>

<style>
  .margin-top {
    margin-top: 10px;
  }
  main {
    padding: 40px;
  }
</style>

<main>
  <div class="container">
    <!-- List profiles -->
    <div class="list-group">
      {#each $profiles as profile}
        <a
          href="#"
          class="list-group-item list-group-item-action"
          class:active={activeProfile(profile)}
          on:click={() => selectProfile(profile)}>
          <i class="fas fa-user" />
          &nbsp; {profile.prenom} {profile.nom}
          <button
            class="btn btn-light btn-sm float-right"
            on:click|stopPropagation={() => deleteProfile(profile)}>
            <i class="fas fa-times" />
          </button>
        </a>
      {/each}
      <a
        href="#"
        class="list-group-item list-group-item-action"
        on:click={() => (createProfileWindow = !createProfileWindow)}>
        <i class="fas fa-plus" />
        &nbsp; Nouveau profil
      </a>
    </div>

    {#if createProfileWindow}
      <div>
        <form on:submit|preventDefault={handleNewProfile}>
          {#each profileSchema as field}
            <input
              class="form-control margin-top"
              type="text"
              bind:value={newProfile[field.key]}
              placeholder={field.value}
              required />
          {/each}
          <div class="text-center">
            <button
              type="submit"
              class="btn btn-outline-primary margin-top center-block">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    {/if}

    <br />

    {#if $profiles.find(p => p.selected)}
      <div class="list-group">
        {#each reasons as reason}
          <a
            href="#"
            class="list-group-item list-group-item-action"
            class:active={activeReason(userSettings.selectedReason, reason)}
            on:click={() => (settings.update(() => ({
              ...$settings,
              selectedReason: reason
            })))}>
            {reason.shortText}
          </a>
        {/each}
      </div>

      <br />
      <label for="created-since">
        Attestation créée il y a {userSettings.createdXMinutesAgo} minute{userSettings.createdXMinutesAgo > 1 ? 's' : ''}
      </label>
      <input
        type="range"
        class="custom-range"
        min="0"
        max="60"
        step="1"
        bind:value={$settings.createdXMinutesAgo}
        id="created-since" />
      <br />
      <br />
      <button
        type="button"
        on:click={() => generatePdf($profiles.find(p => p.selected))}
        class="btn btn-outline-primary btn-lg btn-block">
        Générer l'attestation
      </button>
    {/if}
  </div>
</main>
