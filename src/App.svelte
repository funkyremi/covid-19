<script>
  import { reasons, profileSchema } from "./lib/data";
  import { profiles, settings } from "./lib/stores";
  import { generatePdf } from "./lib/pdf";
  import { guid } from "./lib/utils";

  profiles.useLocalStorage();
  settings.useLocalStorage();

  let createProfileWindow = false;
  let newProfile = { id: guid() };

  function activeReason(selectedReason, reason) {
    return selectedReason && reason.shortText === selectedReason.shortText;
  }
  function selectProfile(profile) {
    const newProfiles = [...$profiles].map(p => ({ ...p, selected: false }));
    const selectedProfileIndex = newProfiles.findIndex(
      p => p.id === profile.id
    );
    newProfiles[selectedProfileIndex].selected = true;
    profiles.update(() => newProfiles);
  }
  function handleNewProfile() {
    const oldProfiles = [...$profiles].map(p => ({ ...p, selected: false }));
    const newProfiles = [...oldProfiles, { ...newProfile, selected: true }];
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
  async function generate(profile, settings) {
    console.log(profile, settings)
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
</script>

<style>
  .margin-top {
    margin-top: 10px;
  }
  main {
    margin-top: 20px;
    padding: 30px;
  }
  .container {
    max-width: 600px;
  }
</style>

<main>
  <div class="container">
    <!-- List profiles -->
    <div class="list-group">
      {#each $profiles as profile}
        <a
          href="javascript:void(0)"
          class="list-group-item list-group-item-action"
          class:active={profile.selected}
          on:click={() => selectProfile(profile)}>
          🙎‍♂️
          &nbsp; {profile.prenom} {profile.nom}
          <button
            class="btn btn-light btn-sm float-right"
            on:click|stopPropagation={() => deleteProfile(profile)}>
            🗑
          </button>
        </a>
      {/each}
      <a
        href="javascript:void(0)"
        class="list-group-item list-group-item-action"
        on:click={() => (createProfileWindow = !createProfileWindow)}>
        ➕
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
            href="javascript:void(0)"
            class="list-group-item list-group-item-action"
            class:active={activeReason($settings.selectedReason, reason)}
            on:click={() => settings.update(() => ({
                ...$settings,
                selectedReason: reason
              }))}>
            {reason.icon}
            &nbsp; {reason.shortText}
          </a>
        {/each}
      </div>

      <br />
      <label for="created-since">
        Attestation créée il y a {$settings.createdXMinutesAgo} minute{$settings.createdXMinutesAgo > 1 ? 's' : ''}
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
        on:click={() => generate($profiles.find(p => p.selected), $settings)}
        class="btn btn-outline-primary btn-lg btn-block">
        📄
        &nbsp; Générer l'attestation
      </button>
    {/if}
  </div>
</main>
