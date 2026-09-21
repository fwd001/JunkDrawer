import { useRouter } from 'vue-router'

/** Back should unwind history; if we landed here directly, fall back to the tool list. */
export function useRouterBack() {
  const router = useRouter()
  return () => {
    if (window.history.state?.back) router.back()
    else void router.replace('/')
  }
}
