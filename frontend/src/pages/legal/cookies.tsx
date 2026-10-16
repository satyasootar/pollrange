import { Cookie } from "lucide-react";
import { Link } from "react-router-dom";
import { openCookieSettings } from "@/lib/consent";
import { COOKIE_CATEGORIES } from "@/lib/cookie-catalog";
import { FocusedPageLayout, FocusedSection } from "@/components/layout/focused-page-layout";

const TOC = [
  { id: "what-are-cookies", label: "What cookies are" },
  { id: "how-we-use-them", label: "How we use them" },
  { id: "cookies-we-use", label: "Cookies we use" },
  { id: "third-parties", label: "Third parties" },
  { id: "respondents", label: "Poll and form respondents" },
  { id: "your-choices", label: "Your choices" },
  { id: "consent-records", label: "Records of your choice" },
  { id: "retention", label: "How long we keep data" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
];

export function CookiePolicyPage() {
  return (
    <FocusedPageLayout
      icon={Cookie}
      eyebrow="Legal"
      title="Cookie Policy"
      subtitle="Last updated October 2026. This page lists every cookie and browser-storage item Kollects uses, what each one is for, and how to control them."
      summary="Kollects only needs a handful of cookies to work. Anything beyond that, like
        analytics, stays off until you turn it on, and you can change your mind at any time.
        We never use cookies for advertising and never share cookie data with advertisers."
      toc={TOC}
    >
      <FocusedSection id="what-are-cookies" title="What cookies are">
        <p>
          Cookies are small text files a website stores in your browser so it can remember
          things between pages and visits, such as whether you're signed in. Websites can also
          use similar technology called <strong>local storage</strong>, which keeps data on your
          device without sending it to the server on every request. This policy covers both,
          and we call them all "cookies" for short.
        </p>
      </FocusedSection>

      <FocusedSection id="how-we-use-them" title="How we use them">
        <p>We sort everything we store into three groups:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Strictly necessary</strong> cookies keep you signed in, remember your cookie
            choice, and stop the same browser answering a poll twice. The site can't work
            without them, so they don't need your consent.
          </li>
          <li>
            <strong>Analytics</strong> cookies tell us which pages people visit, which sites
            send them to us, and what kind of device they use. They use a random ID, never your
            name, email, or poll and form answers. Off unless you turn them on.
          </li>
          <li>
            <strong>Campaign attribution</strong> cookies remember which campaign, search engine
            or website first brought you to Kollects, so we know which channels lead to
            sign-ups. They only work when analytics is also on. Off unless you turn them on.
          </li>
        </ul>
        <p>
          All of our cookies are first-party: they're set by Kollects, for Kollects, and the
          data stays with us.
        </p>
      </FocusedSection>

      <FocusedSection id="cookies-we-use" title="Cookies we use">
        {COOKIE_CATEGORIES.map((cat) => (
          <div key={cat.id} className="space-y-2">
            <p>
              <strong>
                {cat.title}
                {cat.id === "necessary" ? " (always on)" : " (only with your permission)"}.
              </strong>{" "}
              {cat.description}
            </p>
            <div className="overflow-x-auto border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 font-semibold">Name</th>
                    <th className="p-2 font-semibold">Purpose</th>
                    <th className="p-2 font-semibold">Type</th>
                    <th className="p-2 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.entries.map((e) => (
                    <tr key={e.name} className="border-t border-border align-top">
                      <td className="p-2 font-mono">{e.name}</td>
                      <td className="p-2">{e.purpose}</td>
                      <td className="whitespace-nowrap p-2">{e.kind}</td>
                      <td className="p-2">{e.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </FocusedSection>

      <FocusedSection id="third-parties" title="Third parties">
        <p>
          We don't use advertising networks or social media pixels. If you turn on
          Analytics, we also use <strong>Google Analytics</strong>, which sets its own{" "}
          <code>_ga</code> cookies; with Analytics off, it isn't loaded at all.
        </p>
        <p>
          If you choose <strong>Sign in with Google</strong>, you're briefly sent to Google, and
          Google may set its own cookies on its own site under{" "}
          <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noreferrer" className="text-primary underline">
            Google's cookie policy
          </a>
          . We don't control or receive those cookies.
        </p>
      </FocusedSection>

      <FocusedSection id="respondents" title="Poll and form respondents">
        <p>
          If you're answering someone's poll or form, Kollects doesn't run analytics or campaign
          cookies on that page at all, and won't show you a cookie banner there. The only things
          we store are the strictly necessary items that stop duplicate answers and keep your
          answers safe if you need to sign in before submitting.
        </p>
      </FocusedSection>

      <FocusedSection id="your-choices" title="Your choices">
        <p>
          When you first visit, we ask before using any optional cookie. <strong>Reject all</strong>{" "}
          is as easy as <strong>Accept all</strong>, and you can pick categories one by one.
          Optional cookies start switched off, so if your browser sends a Global Privacy Control
          signal, nothing optional runs unless you turn it on yourself.
        </p>
        <p>
          You can change your choice at any time from{" "}
          <button type="button" onClick={openCookieSettings} className="text-primary underline">
            Cookie settings
          </button>{" "}
          (also linked in the footer of every page). Turning a category off deletes its cookies
          from your browser straight away.
        </p>
        <p>
          You can also block or delete cookies in your browser's settings. If you block strictly
          necessary cookies, you won't be able to sign in.
        </p>
      </FocusedSection>

      <FocusedSection id="consent-records" title="Records of your choice">
        <p>
          Each time you make or change a choice, we keep a record so we can show what you agreed
          to and when. It contains a random consent ID, the categories you allowed, the version
          of this policy, the page you were on, whether your browser sent Global Privacy Control,
          your browser, operating system and device type, and a one-way hash of your IP address
          (never the address itself). If you're signed in, it's linked to your account.
        </p>
      </FocusedSection>

      <FocusedSection id="retention" title="How long we keep data">
        <p>
          Each cookie's lifetime is listed in the tables above. Analytics data on our servers is
          deleted automatically after about 13 months. Records of your cookie choices are kept for
          as long as we need them to show we asked for consent properly.
        </p>
      </FocusedSection>

      <FocusedSection id="changes" title="Changes to this policy">
        <p>
          If we add a new type of cookie or change what one is used for, we'll update this page
          and ask for your choice again before using it.
        </p>
      </FocusedSection>

      <FocusedSection id="contact" title="Contact us">
        <p>
          Questions about cookies? Email{" "}
          <a href="mailto:privacy@kollects.com" className="text-primary underline">privacy@kollects.com</a>. For
          everything else about how we handle your data, see our{" "}
          <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
        </p>
      </FocusedSection>
    </FocusedPageLayout>
  );
}
