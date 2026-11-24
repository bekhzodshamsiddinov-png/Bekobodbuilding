import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";
import { LeadForm } from "./LeadForm";

export async function ContactSection({ id = "aloqa" }: { id?: string }) {
  const t = await getTranslations("contact");
  const tl = await getTranslations("lead");
  return (
    <section id={id} className="bg-paper-2 py-[clamp(84px,11vw,150px)]">
      <div className="wrap grid items-start gap-[clamp(32px,6vw,96px)] md:grid-cols-2">
        <div className="rv">
          <div className="eyebrow">{t("eyebrow")}</div>
          <h2 className="mt-[18px] mb-[22px] text-[clamp(36px,4.6vw,66px)] leading-[1.04]">{t("title")}</h2>
          <p className="m-0 max-w-[46ch] text-muted">{t("text")}</p>
          <div className="mt-9 grid gap-[18px]">
            {[
              [t("phone"), site.phoneHref ? <a href={site.phoneHref}>{site.phone}</a> : site.phone],
              [t("office"), site.address],
              [t("hours"), t("hoursValue")],
            ].map(([k, v], i) => (
              <div key={i} className="border-t border-line pt-3.5">
                <span className="mono-label mb-2 block text-muted">{k}</span>
                <b className="font-display text-2xl font-normal">{v}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="rv border border-line bg-paper-3 p-[clamp(22px,3vw,40px)]">
          <h3 className="mb-5 text-[28px]">{tl("titleCall")}</h3>
          <LeadForm intent="call" salesPhone={site.phone} />
        </div>
      </div>
    </section>
  );
}
