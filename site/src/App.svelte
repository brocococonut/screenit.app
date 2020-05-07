<script>
  import Tailwind from "./Tailwind.svelte";
  import isURL from "validator/lib/isURL";
  import { sanitizeUrl } from "@braintree/sanitize-url";
	import { toast } from "@brocococonut/toast.js/toast.mjs";
	import { tick } from 'svelte'

  let url = "";
  let size = "d";
  let fullpage = false;
  let isValidURL = true;
  let border = "border-gray-200";

  let imageURL = "";
  let showImage = false;
	let loading = false;
	
	// Reactive statement to check the validity of the URL
  $: {
    isURL(url)
      ? ((isValidURL = true), (border = "border-gray-200"))
      : ((isValidURL = false), (border = "border-red-500"));
  }

	// Do some simple state management and construct a query string for the image
  async function loadImage() {
    if (!isValidURL) return toast("Invalid URL", 4000, "error");
    try {
			showImage = false
			imageURL = ''

			// Force Svelte to tick over so a user can request the same image a
			// second time
			await tick()
			
      const sanitised = sanitizeUrl(url);
      const query = new URLSearchParams();

      query.set("url", sanitised);
      query.set("size", size);
      if (fullpage) query.set("fullpage", true);

      imageURL = `/screenshot?${query.toString()}`;
      loading = true;
			showImage = true;
			// TODO: Move loading of image to inside this function for better error handling
    } catch (err) {
			return toast(err.toString(), 4000, "error");
			imageURL = ''
			loading = false
			showImage = false;
    }
  }

  function imageFailed(a, b, c) {
    showImage = false;
    loading = false;
    imageURL = "";
    toast(
      "Failed to get a screenshot of the provided URL. If you're sure it's correct then please reload and try again.",
      6000,
      "error"
    );
  }

  function imageFinished(ev) {
    loading = false;
  }
</script>

<style>
  #fullpage:checked + label {
    background-color: rgb(51, 51, 51);
    color: rgb(240, 240, 240);
  }
  @keyframes loadbaralt {
    0%,
    to {
      left: 0;
      right: 80%;
    }
    25%,
    75% {
      left: 0;
      right: 0;
    }
    50% {
      left: 80%;
      right: 0;
    }
  }
  .gg-loadbar-alt,
  .gg-loadbar-alt::before,
  .gg-loadbar-alt::after {
    display: block;
    box-sizing: border-box;
    height: 0.375rem;
    border-radius: 0.25rem;
    margin-bottom: -0.375rem;
  }
  .gg-loadbar-alt {
    position: relative;
    transform: scale(var(--ggs, 1));
    width: 100%;
  }
  .gg-loadbar-alt::after,
  .gg-loadbar-alt::before {
    background: #333;
    content: "";
    position: absolute;
  }
  .gg-loadbar-alt::before {
    width: 100%;
    background: #c2c2c2;
  }
  .gg-loadbar-alt::after {
    animation: loadbaralt 2s cubic-bezier(0, 0, 0.58, 1) infinite;
  }

  .gg-coffee {
    box-sizing: border-box;
    position: relative;
    display: inline-block;
    transform: scale(var(--ggs, 1));
    width: 18px;
    height: 14px;
    border: 2px solid;
    border-radius: 6px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
		margin-top: 3px;
		border-color: #402a10;
  }
  .gg-coffee::after,
  .gg-coffee::before {
    content: "";
    display: inline-block;
    box-sizing: border-box;
		position: absolute;
		border-color: #402a10
  }
  .gg-coffee::before {
    left: 2px;
    background: #402a10;
    box-shadow: 4px 0 0, 8px 0 0;
    border-radius: 3px;
    width: 2px;
    height: 4px;
    top: -7px;
  }
  .gg-coffee::after {
    width: 6px;
    height: 8px;
    border: 2px solid #402a10;
    border-radius: 100px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    right: -6px;
    top: -1px;
  }

  .gg-heart,
  .gg-heart::after {
    border: 2px solid #e53e3e;
    border-top-left-radius: 100px;
    border-top-right-radius: 100px;
    width: 10px;
    height: 8px;
    border-bottom: 0;
  }

  .gg-heart {
    box-sizing: border-box;
    position: relative;
    transform: translate(
        calc(-10px / 2 * var(--ggs, 1)),
        calc(-6px / 2 * var(--ggs, 1))
      )
      rotate(-45deg) scale(var(--ggs, 1));
    display: inline-block;
  }

  .gg-heart::after,
  .gg-heart::before {
    content: "";
    display: inline-block;
    box-sizing: border-box;
    position: absolute;
  }

  .gg-heart::after {
    right: -9px;
    transform: rotate(90deg);
    top: 5px;
  }

  .gg-heart::before {
    width: 11px;
    height: 11px;
    border-left: 2px solid #e53e3e;
    border-bottom: 2px solid #e53e3e;
    left: -2px;
    top: 3px;
  }
</style>
<Tailwind />

<main class="flex h-screen max-h-full">
  <div class="w-full max-w-4xl max-h-xs m-auto px-4">
    {#if showImage}
      {#if loading}
        <i class="gg-loadbar-alt" />
      {/if}
      <img
        src={imageURL}
        alt="Website screenshot"
        class="mb-6 mt-6 {loading ? 'hidden' : ''}"
        on:error={imageFailed}
        on:load={imageFinished} />
    {/if}
    <div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <!-- URL -->
      <div class="flex flex-wrap -mx-3 mb-6">
        <div class="w-full px-3 ">
          <label
            class="block uppercase tracking-wide text-gray-700 text-xs font-bold
            mb-2"
            for="url">
            URL
          </label>
          <input
            class="appearance-none border rounded w-full py-2 px-3 text-gray-700
            mb-3 leading-tight focus:outline-none focus:shadow-outline {border}"
            id="url"
            type="text"
            bind:value={url}
            placeholder="https://google.com"
            on:keyup={e => e.key === 'Enter' && loadImage()} />
        </div>
      </div>

      <!-- Screen size & fullpage-->
      <div class="flex flex-wrap -mx-3 mb-0 md:mb-6">
        <!-- Screen size -->
        <div class="w-full md:w-1/2 px-3 mb-4 md:mb-4">
          <div class="relative text-center">
            <select
              class="block appearance-none w-full bg-gray-200 border
              border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight
              focus:outline-none focus:bg-white focus:border-gray-500"
              id="size"
              bind:value={size}>
              <option selected disabled value="d">Screen Size</option>
              <option value="d">Desktop (1920x1080)</option>
              <option value="t">Tablet (1024x1366)</option>
              <option value="d">Mobile (375x812)</option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 flex
              items-center px-2 text-gray-700">
              <svg
                class="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20">
                <path
                  d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757
                  6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Fullscreen screenshot -->
        <div class="w-full md:w-1/2 px-3 mb-4 md:mb-4">
          <input
            type="checkbox"
            id="fullpage"
            class="hidden"
            bind:value={fullpage}
            on:keyup={e => e.key === 'Enter' && loadImage()} />
          <label
            class="block appearance-none w-full bg-gray-200 border
            border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight
            focus:outline-none focus:bg-white focus:border-gray-500 text-center
            select-none cursor-pointer"
            for="fullpage">
            Take full page screenshot{fullpage ? '?' : '!'}
          </label>
          <!-- <label class="flex items-center text-gray-700 font-bold h-full">
						<input class="inline-block mr-2 my-auto leading-tight" type="checkbox">
						<span class="text-sm">
							Take full page screenshot
						</span>
					</label> -->
        </div>
      </div>

      <!-- Screenshot button -->
      <div class="flex flex-wrap -mx-3 mb-2">
        <div class="w-full px-3">
          <button
            class="w-full px-3 bg-blue-500 hover:bg-blue-700 text-white
            font-bold py-2 px-4 rounded"
            on:click={loadImage}>
            Screenshot
          </button>
        </div>
      </div>
    </div>
  	<p class="text-center text-gray-500 text-xs">Made with <i class="gg-heart align-middle mx-1"></i> and <a href="https://ko-fi.com/brocococonut"><i class="gg-coffee align-middle mr-1 ml-0"></i></a> by <a href="https://brococo.co">@brocococonut</a></p>
  </div>
  
</main>
