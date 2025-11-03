import ThrivecartEmbed from "@/components/thrivecart/ThrivecartEmbed";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#faf9f6] py-16 px-6">
      {/* ✅ Client-side Thrivecart loader */}
      <ThrivecartEmbed />

      <div className="max-w-5xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-extrabold text-[#2d2d2d] mb-3">
          Choose Your Plan
        </h1>
        <p className="text-[#6b6b6b] text-lg">
          Simple, transparent pricing to scale your AI experience.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* 🌱 Starter Tier */}
        <div className="border border-[#e0ddd4] bg-white rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div>
            <h3 className="text-2xl font-semibold mb-2 text-[#2d2d2d]">Starter</h3>
            <p className="text-4xl font-bold text-[#d97757] mb-4">
              $29
              <span className="text-sm font-medium text-[#6b6b6b]">/mo</span>
            </p>
            <p className="text-[#6b6b6b] mb-6">10,000 credits per month</p>
            <ul className="text-sm text-[#6b6b6b] mb-10 space-y-1">
              <li>✓ Access to core AI chat features</li>
              <li>✓ Email support</li>
            </ul>
          </div>

          <div className="mt-auto">
            <a
              data-thrivecart-account="leveraged-creator"
              data-thrivecart-tpl="v2"
              data-thrivecart-product="7"
              className="thrivecart-button block w-full text-center px-4 py-3 bg-[#d97757] text-white font-medium rounded-lg hover:bg-[#c86545] transition-colors cursor-pointer"
            >
              Subscribe
            </a>
          </div>
        </div>

        {/* 🚀 Pro Tier */}
        <div className="relative border-2 border-[#d97757] bg-white rounded-2xl p-6 flex flex-col shadow-md hover:shadow-lg transition-shadow">
          {/* ✅ Fixed badge (aligned to border, not rounded all sides) */}
          <div className="absolute top-0 right-0">
            <div className="bg-[#d97757] text-white text-xs font-semibold px-3 py-1 rounded-tr-xl rounded-bl-md">
              BEST VALUE
            </div>
          </div>

          <div className="mt-3">
            <h3 className="text-2xl font-semibold mb-2 text-[#2d2d2d]">Pro</h3>
            <p className="text-4xl font-bold text-[#d97757] mb-4">
              $99
              <span className="text-sm font-medium text-[#6b6b6b]">/mo</span>
            </p>
            <p className="text-[#6b6b6b] mb-6">40,000 credits + AI tools</p>
            <ul className="text-sm text-[#6b6b6b] mb-10 space-y-1">
              <li>✓ AI Hooks Generator</li>
              <li>✓ Image Ad Generator</li>
              <li>✓ Priority support</li>
              <li>✓ Early access to new features</li>
            </ul>
          </div>

          <div className="mt-auto">
            <a
              data-thrivecart-account="leveraged-creator"
              data-thrivecart-tpl="v2"
              data-thrivecart-product="8"
              className="thrivecart-button block w-full text-center px-4 py-3 bg-[#d97757] text-white font-medium rounded-lg hover:bg-[#c86545] transition-colors cursor-pointer"
            >
              Subscribe
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
