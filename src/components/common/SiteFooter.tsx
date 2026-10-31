// 사이트 바닥글 (소유: A). 모바일에서는 하단 탭바에 가리지 않게 아래 여백을 둔다.
import Link from 'next/link';
import { ROUTES } from './routes';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-muted pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          <p className="text-base font-extrabold text-primary">ExitOS</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            가게의 숫자를 증빙과 맞춰 보여주고, 거래가 끝나면 인수인계까지 이어 주는 매장 양도 서비스
          </p>
        </div>
        <FooterCol title="서비스" links={[['매물 찾기', '/'], ['내 가게 팔기', ROUTES.sell], ['인수인계', ROUTES.handover]]} />
        <FooterCol title="안내" links={[['출처 배지 보는 법', '/'], ['이용약관', '/'], ['개인정보처리방침', '/']]} />
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-muted-foreground md:px-6">
          VERY×NEXT 해커톤 8팀 시연용 서비스 · 매물·사진은 시연용 예시입니다 · 표시된 추정치는 감정평가·법률·세무 자문을 대체하지 않습니다.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
