import Image from "next/image";
import Link from "next/link";
import { WelcomeAuthButtons } from "@/components/auth/GuestLoginButton";
import { zebraHero } from "@/lib/nature-images";

export default function WelcomePage() {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      <Image
        src={zebraHero}
        alt="草原斑马"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        placeholder="blur"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-6 pb-20 pt-28 sm:px-10 sm:pb-24 lg:justify-center lg:pb-32 lg:pt-32">
        <div className="max-w-2xl pl-2 sm:pl-4 ml-6 sm:ml-10 lg:ml-16 xl:ml-24">
          <p className="font-sans text-5xl font-bold tracking-tight text-np-welcome-brand drop-shadow-md sm:text-6xl lg:text-7xl xl:text-8xl">
            Nature+
          </p>
          <h1 className="mt-2 text-5xl font-bold leading-tight tracking-tight text-np-welcome-title drop-shadow-lg sm:mt-3 sm:text-6xl lg:mt-4 lg:text-7xl xl:text-8xl ml-10 sm:ml-14 lg:ml-20 xl:ml-28">
            智能图鉴
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/90 drop-shadow sm:text-lg">
            欢迎。游客可浏览探索；注册后可保存图鉴与文献（账号数据存于云端）。
          </p>
          <Link
            href="/guide"
            className="mt-4 inline-block text-sm font-medium text-white/85 underline-offset-2 hover:text-white hover:underline"
          >
            查看使用说明
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end gap-3 px-4 pt-5 sm:px-8">
        <WelcomeAuthButtons />
      </div>
    </div>
  );
}
