<script>
  import Test from '@/views/Test/components/Head'

  let visible = false

  setTimeout(() => {
    visible = true
  }, 500)
</script>

<div class="box">
  {#if visible}
    <Test />
  {/if}
  <h1>Cybernetically enhanced web apps</h1>
  <p class="tip">
    Visit the
    <a href="https://svelte.dev/tutorial">Svelte tutorial</a>
    to learn how to build Svelte apps.
  </p>
</div>

<style>
  .box {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  h1 {
    color: #ffd8cc;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
    text-align: center;
  }

  .tip {
    text-align: center;
    color: #676778;
  }
</style>
