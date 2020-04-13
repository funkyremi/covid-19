<script>
  import { writable } from "svelte/store";
  export let motifs;
  export let profileSchema;

  let createProfileWindow = false;
  let profiles = [];
  let newProfile = {};
  let selectedProfile;
  let createdXMinutesAgo = 0;

  function generatePdf(selectedProfile, motif) {
    console.log(selectedProfile, motif);
  }
  function active(selectedProfile, profile) {
    return selectedProfile && profile.prenom === selectedProfile.prenom;
  }
  function handleNewProfile() {
    profiles = [...profiles, newProfile];
    createProfileWindow = false;
    selectedProfile = newProfile;
    newProfile = {};
  }
  function handleNewProfileWindow() {
    createProfileWindow = !createProfileWindow;
  }
</script>

<style>
  .margin-top {
    margin-top: 10px;
  }
</style>

<main>
  <div class="container">
    <h1 class="text-center">Générateur d'attestation</h1>

    <hr />

    <!-- List profiles -->
    <div class="list-group">
      {#each profiles as profile}
        <a
          href="#"
          class="list-group-item list-group-item-action"
          class:active={active(selectedProfile, profile)}
          on:click={() => (selectedProfile = profile)}>
          {profile.prenom} {profile.nom}
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
              placeholder={field.value} />
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

    {#if selectedProfile}
      <div class="list-group">
        {#each motifs as motif}
          <a
            href="#"
            class="list-group-item list-group-item-action"
            on:click={() => generatePdf(selectedProfile, motif)}>
            {motif.shortText}
          </a>
        {/each}
      </div>
    {/if}
  </div>
</main>
