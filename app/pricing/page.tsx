import ThrivecartEmbed from "@/components/thrivecart/ThrivecartEmbed";

export default function Pricing() {
  return (
    <div className="p-10 max-w-4xl mx-auto">
      {/* ✅ Client-side Thrivecart loader */}
      <ThrivecartEmbed />

      <h1 className="text-3xl font-bold text-center mb-10">Choose Your Plan</h1>
      <div className="grid md:grid-cols-2 gap-6">

        {/* Tier 1 */}
        <div className="border border-[#e0ddd4] rounded-lg p-6">
          <h3 className="text-xl font-bold mb-2">Starter</h3>
          <p className="text-3xl font-bold text-[#d97757] mb-4">$29<span className="text-sm">/mo</span></p>
          <p className="text-[#6b6b6b] mb-4">10,000 credits per month</p>
          <a
            data-thrivecart-account="leveraged-creator"
            data-thrivecart-tpl="v2"
            data-thrivecart-product="7"
            className="thrivecart-button block w-full text-center px-4 py-2 bg-[#d97757] text-white rounded-lg hover:bg-[#c86545] transition-colors cursor-pointer"
          >
            Subscribe
          </a>
        </div>

        {/* Tier 2 */}
        <div className="border-2 border-[#d97757] rounded-lg p-6">
          <div className="text-xs text-[#d97757] font-bold mb-2">BEST VALUE</div>
          <h3 className="text-xl font-bold mb-2">Pro</h3>
          <p className="text-3xl font-bold text-[#d97757] mb-4">$99<span className="text-sm">/mo</span></p>
          <p className="text-[#6b6b6b] mb-4">40,000 credits + AI tools</p>
          <ul className="text-sm text-[#6b6b6b] mb-4 space-y-1">
            <li>✓ AI Hooks Generator</li>
            <li>✓ Image Ad Generator</li>
          </ul>
          <a
            data-thrivecart-account="leveraged-creator"
            data-thrivecart-tpl="v2"
            data-thrivecart-product="8"
            className="thrivecart-button block w-full text-center px-4 py-2 bg-[#d97757] text-white rounded-lg hover:bg-[#c86545] transition-colors cursor-pointer"
          >
            Subscribe
          </a>
        </div>
      </div>
    </div>
  );
}
