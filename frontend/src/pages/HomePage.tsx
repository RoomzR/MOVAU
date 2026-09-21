import { ArrowRight, MapPin, Radio, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";

import { CountryInterface } from "../components/home/CountryInterface";
import { NearbyNow } from "../components/home/NearbyNow";
import { ShiftKick } from "../components/home/ShiftKick";
import { SystemLoop } from "../components/home/SystemLoop";
import { ThreeSteps } from "../components/home/ThreeSteps";
import { Container } from "../components/layout/Container";
import { AppFooter } from "../components/layout/AppFooter";
import { FlipWord } from "../components/motion/FlipWord";
import { KineticTitle } from "../components/motion/KineticTitle";
import { Marquee } from "../components/motion/Marquee";
import { PageSheet } from "../components/motion/PageSheet";
import { SectionDeck } from "../components/motion/SectionDeck";
import { Button } from "../components/ui/Button";

const MARQUEE = [
  "Мінск",
  "Брэст",
  "Гомель",
  "Гродна",
  "Віцебск",
  "Магілёў",
  "Баранавічы",
  "Бабруйск",
  "Пінск",
  "Орша",
  "Ліда",
  "Полацк",
  "Салігорск",
  "Мазыр",
  "Дарма",
  "На смене",
  "Точка",
  "Смена",
];

const FEED = [
  { category: "Аптека", title: "Нужны капли в Мінске", meta: "350 м" },
  { category: "Продукты", title: "Хлеб и молоко, Брэст", meta: "Дарма" },
  { category: "Дорога", title: "Сел аккумулятор, Гомель", meta: "1.2 км" },
  { category: "Животные", title: "Выгулять собаку, Гродна", meta: "На смене" },
  { category: "Дом", title: "Занести сумки, Віцебск", meta: "800 м" },
  { category: "Дети", title: "Забрать из школы, Магілёў", meta: "Дарма" },
];

export function HomePage() {
  const reduce = useReducedMotion();

  return (
    <SectionDeck>
      <PageSheet index="01" title="Рядом">
        <Container className="grid flex-1 items-stretch gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Мова дапамогі</p>
              <h1 className="mt-3 font-display text-[clamp(3.25rem,11vw,9rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.05em]">
                <span className="block text-foreground">
                  <KineticTitle text="Помощь" />
                </span>
                <span className="word-volt block">
                  <FlipWord words={["рядом", "дарма", "сейчас", "в стране"]} />
                </span>
              </h1>
              <motion.p
                initial={reduce === true ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
              >
                Заявка — точка на карте. Кто на смене — идёт. Вся Беларусь, не доска объявлений.
              </motion.p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register">
                  <Button size="lg">
                    Нужна помощь
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
                <Link to="/requests">
                  <Button size="lg">Я на смене</Button>
                </Link>
              </div>
            </div>
            <div className="grid gap-px bg-zinc-800 sm:grid-cols-3">
              {[
                { Icon: MapPin, label: "Страна", hint: "Все города" },
                { Icon: Radio, label: "Live", hint: "Смена на карте" },
                { Icon: Zap, label: "Дарма", hint: "Карма копится" },
              ].map(({ Icon, label, hint }) => (
                <div key={label} className="bg-background px-4 py-4">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="mt-3 font-display text-xl uppercase leading-none">{label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{hint}</p>
                </div>
              ))}
            </div>
          </div>
          <NearbyNow items={FEED} className="h-full min-h-[320px]" />
        </Container>
        <Marquee items={MARQUEE} />
      </PageSheet>

      <PageSheet index="02" title="Система" tone="raised">
        <SystemLoop />
      </PageSheet>

      <PageSheet index="03" title="Страна">
        <CountryInterface />
      </PageSheet>

      <PageSheet index="04" title="Как это" tone="deep">
        <ThreeSteps />
      </PageSheet>

      <PageSheet index="05" title="Старт" tone="deep">
        <ShiftKick />
        <AppFooter />
      </PageSheet>
    </SectionDeck>
  );
}
