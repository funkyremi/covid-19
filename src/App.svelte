<script>
  import { reasons, profileSchema } from "./lib/data";
  import { profiles, settings } from "./lib/stores";
  import { generatePdf } from "./lib/pdf";
  import { guid } from "./lib/utils";
  import SignaturePad from "signature_pad";



  profiles.useLocalStorage();
  settings.useLocalStorage();

  let createProfileWindow = false;
  let editProfileWindow = false;
  let newProfile = { id: guid() };
  let profileToEdit = {};
  let signaturePad;

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
    newProfile.signature = signaturePad.toDataURL();
    const oldProfiles = [...$profiles].map(p => ({ ...p, selected: false }));
    const newProfiles = [...oldProfiles, { ...newProfile, selected: true }];
    profiles.update(() => newProfiles);
    createProfileWindow = false;
    newProfile = { id: guid() };
  }
  function handleExistingProfile() {
    profileToEdit.signature = signaturePad.toDataURL();
    const oldProfiles = [...$profiles].filter(p => p.id !== profileToEdit.id).map(p => ({ ...p, selected: false }));
    const newProfiles = [...oldProfiles, { ...profileToEdit, selected: true }];
    profiles.update(() => newProfiles);
    editProfileWindow = false;
  }
  function deleteProfile(profile) {
    const tempProfiles = $profiles;
    const index = tempProfiles.findIndex(p => p.id === profile.id);
    tempProfiles.splice(index, 1);
    profiles.update(() => tempProfiles);
  }
  function editProfile(profile) {
    editProfileWindow = !editProfileWindow;
    profileToEdit = profile;
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
  function getProfileName(profile) {
    return profile.intitule || `${profile.prenom} ${profile.nom}`;
  }
  function initSignature() {
    setTimeout(() => {
      const canvas = document.querySelector("canvas");
      signaturePad = new SignaturePad(canvas);
    }, 0);
    return '';
  }
  function loadSignature(profile) {
    setTimeout(() => {
      const canvas = document.querySelector("canvas");
      signaturePad = new SignaturePad(canvas);
      if (profile.signature) {
        signaturePad.fromDataURL(profile.signature, {ratio: 1});
      }
    }, 0);
    return '';
  }
</script>

<style>
  .margin-top {
    margin-top: 10px;
  }
  .margin-left {
    margin-left: 5px;
  }
  main {
    margin-top: 20px;
    padding: 30px;
  }
  .container {
    max-width: 600px;
  }
  canvas {
    border: 1px solid #ced4da;
    border-radius: 5px;
  }
  .clickable {
    cursor: pointer;
  }
  p {
    color: #495057;
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
          <i class="fas fa-user" />
          &nbsp; {getProfileName(profile)}
          <button
            class="btn btn-light btn-sm float-right margin-left"
            on:click|stopPropagation={() => deleteProfile(profile)}>
            <i class="fas fa-times" />
          </button>
          <button
            class="btn btn-light btn-sm float-right"
            on:click|stopPropagation={() => editProfile(profile)}>
            <i class="fas fa-edit" />
          </button>
        </a>
      {/each}
      <a
        href="javascript:void(0)"
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
              required={field.key !== "intitule"} />
          {/each}
          <div class="text-center margin-top">
            <p>Signature (optionnel)&nbsp;&nbsp;<span class="clickable" on:click={signaturePad.clear()}><i class="fas fa-undo" /></span></p>
            <canvas>{initSignature()}</canvas>
          </div>
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

    {#if editProfileWindow}
      <div>
        <form on:submit|preventDefault={handleExistingProfile}>
          {#each profileSchema as field}
            <input
              class="form-control margin-top"
              type="text"
              bind:value={profileToEdit[field.key]}
              placeholder={field.value}
              required={field.key !== "intitule"} />
          {/each}
          <div class="text-center margin-top">
            <p>Signature (optionnel)&nbsp;&nbsp;<span class="clickable" on:click={signaturePad.clear()}><i class="fas fa-undo" /></span></p>
            <canvas>{loadSignature(profileToEdit)}</canvas>
          </div>
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
            <i class="fas fa-{reason.icon}" />
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
        <i class="fas fa-file-pdf" />
        &nbsp; Générer l'attestation
      </button>
    {/if}
  </div>
</main>
