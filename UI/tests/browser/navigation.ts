// Only the surrounding Next navigation is substituted in the standalone smoke.
const router = { replace: () => {}, push: () => {} };
export const useRouter = () => router;
export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
