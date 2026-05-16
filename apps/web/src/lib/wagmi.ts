import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

// Must be a valid WalletConnect project ID or an empty string
// Get a free one at: https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = getDefaultConfig({
  appName: "AgentBounty",
  projectId,
  chains: [sepolia],
  ssr: true,
});
