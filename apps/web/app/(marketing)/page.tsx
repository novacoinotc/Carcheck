import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Globe2,
  Search,
  AlertTriangle,
  Brain,
  FileSearch,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowRight,
  Users,
  Building2,
  Store,
  Landmark,
  Wallet,
  Gauge,
  FileWarning,
  ScanLine,
  Clock,
  Lock,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SocialProofBar />
      <WhyCarCheckSection />
      <AdvantagesSection />
      <HowItWorksSection />
      <ComparisonSection />
      <SourcesGallerySection />
      <SampleFindingsSection />
      <ChocolateCarsSection />
      <AudiencesSection />
      <PricingPreviewSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}

function HeroSection() {
  return (
    <section className="container mx-auto px-4 py-20 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Powered by Claude AI · 96 fuentes oficiales
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          La auditoría vehicular más completa de{' '}
          <span className="text-primary">México</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground">
          Antes de comprar un auto usado, sabe TODO de él. Más de 90 fuentes oficiales analizadas
          por inteligencia artificial en menos de 15 segundos. Cobertura única de los 32 estados y
          de su historial en Estados Unidos.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/decode"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            Decodificar VIN gratis
          </Link>
          <Link
            href="/ejemplo"
            className="inline-flex h-12 items-center justify-center rounded-md border bg-background px-8 text-base font-medium hover:bg-muted transition-colors"
          >
            Ver reporte de ejemplo
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Reporte completo desde <strong className="text-foreground">$199 MXN</strong> · Sin
          suscripción · Resultado en 15 segundos
        </p>
      </div>
    </section>
  );
}

function SocialProofBar() {
  return (
    <section className="border-y bg-muted/30 py-6">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-4 uppercase tracking-wide">
          Construido con datos de fuentes oficiales
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-muted-foreground">
          <span>REPUVE</span>
          <span>•</span>
          <span>NHTSA</span>
          <span>•</span>
          <span>NMVTIS</span>
          <span>•</span>
          <span>ANAM</span>
          <span>•</span>
          <span>SAT</span>
          <span>•</span>
          <span>SEDEMA</span>
          <span>•</span>
          <span>OCRA</span>
          <span>•</span>
          <span>RUG</span>
          <span>•</span>
          <span>32 estados MX</span>
        </div>
      </div>
    </section>
  );
}

function WhyCarCheckSection() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Lo que Carfax MX no te dice
        </h2>
        <p className="text-lg text-muted-foreground">
          CarCheck cubre los 32 estados de México (los demás cubren 3 o 4), cruza con el historial
          americano y usa IA para explicarte qué significa todo eso.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <FeatureCard
          icon={Globe2}
          title="Cobertura dual MX + US"
          description="Único en México con cobertura completa de los 32 estados e historial en Estados Unidos. Ideal para los más de 3 millones de autos chocolate regularizados."
        />
        <FeatureCard
          icon={Zap}
          title="15 segundos, 96 fuentes"
          description="REPUVE, OCRA, RUG, SAT, ANAM, NMVTIS, NHTSA, los 32 estados, verificación ambiental, subastas y más. Todo en paralelo."
        />
        <FeatureCard
          icon={Brain}
          title="IA que interpreta por ti"
          description="No es solo un PDF con datos crudos: Claude AI lee toda la información y te dice en español claro qué es bueno, qué es malo, y qué preguntarle al vendedor."
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <Icon className="h-10 w-10 text-primary mb-4" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      icon: Search,
      title: 'Captura el VIN o la placa',
      description: 'Solo necesitas uno de los dos. Validamos formato y checksum al instante.',
    },
    {
      icon: FileSearch,
      title: 'Consultamos 96 fuentes en paralelo',
      description:
        'NHTSA y NMVTIS por API en segundos. REPUVE, OCRA y los 32 estados con scrapers + 2Captcha. Todo simultáneo.',
    },
    {
      icon: Brain,
      title: 'Claude AI interpreta los datos',
      description:
        'Cruza información, detecta inconsistencias y te entrega un análisis ejecutivo más recomendaciones específicas.',
    },
    {
      icon: ShieldCheck,
      title: 'Score 0-100 + PDF descargable',
      description:
        'Verde, amarillo o rojo. PDF compartible con tu mecánico, vendedor o aseguradora.',
    },
  ];
  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Cómo funciona?</h2>
          <p className="text-lg text-muted-foreground">
            De click a reporte en menos de 15 segundos. Cuatro pasos por fuera, un motor de
            datos masivo por dentro.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {steps.map((step, idx) => (
            <div key={step.title} className="relative">
              <div className="rounded-2xl border bg-card p-6 h-full">
                <div className="absolute -top-4 left-6 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </div>
                <step.icon className="h-8 w-8 text-primary mb-3 mt-2" />
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-5xl mx-auto rounded-2xl border bg-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Qué pasa por debajo del capó</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-3 text-sm">
            <div>
              <p className="font-semibold mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Orquestación en paralelo
              </p>
              <p className="text-muted-foreground">
                Las 96 fuentes se consultan al mismo tiempo, no en fila. APIs como NHTSA vPIC y
                NMVTIS responden en &lt;2 s; los scrapers de REPUVE, OCRA y los 32 portales
                estatales corren simultáneos con resolución automática de captcha (2Captcha).
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> La IA cruza los datos
              </p>
              <p className="text-muted-foreground">
                Claude Opus 4.7 recibe todo el dato crudo y lo correlaciona: compara odómetro de US
                vs MX, valida que el pedimento ANAM coincida con REPUVE, detecta título salvage
                escondido y contradicciones entre fuentes que un humano no vería.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Score + análisis escrito
              </p>
              <p className="text-muted-foreground">
                El resultado no es un volcado de datos: es un resumen ejecutivo en español, banderas
                rojas y verdes, hallazgos cruzados, recomendaciones y preguntas para el vendedor.
                Todo con score 0-100, PDF descargable y link compartible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdvantagesSection() {
  const advantages = [
    {
      icon: Globe2,
      title: 'Cobertura que nadie más tiene',
      description:
        'Los 32 estados de México en un solo reporte (los demás cubren 3 o 4) más historial completo en Estados Unidos vía NMVTIS, NHTSA y subastas.',
    },
    {
      icon: Brain,
      title: 'IA que sí entiende de autos',
      description:
        'Claude Opus 4.7 no solo resume: cruza fuentes, detecta fraude y traduce 96 reportes técnicos a un veredicto claro en español que cualquiera entiende.',
    },
    {
      icon: Clock,
      title: 'Resultado en 15 segundos',
      description:
        'Sin esperar días ni llamadas. Capturas el VIN o la placa y en lo que tomas un café tienes el reporte completo en pantalla y en PDF.',
    },
    {
      icon: Wallet,
      title: 'Sin suscripción, precio honesto',
      description:
        'Pagas solo cuando consultas, desde $199 MXN. Decodificar el VIN siempre es gratis. Nada de planes mensuales que olvidas cancelar.',
    },
    {
      icon: Lock,
      title: 'Privacidad por diseño',
      description:
        'Nunca exponemos el nombre del propietario. Cumplimos LFPDPPP en México y DPPA en Estados Unidos. Solo el historial del vehículo, no el de la persona.',
    },
    {
      icon: FileWarning,
      title: 'Especialistas en autos chocolate',
      description:
        'El único reporte que cruza pedimento ANAM, título americano NMVTIS, subastas Copart/IAA y estatus REPUVE para destapar importaciones mal regularizadas.',
    },
  ];
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Por qué CarCheck?</h2>
        <p className="text-lg text-muted-foreground">
          Seis razones concretas por las que somos la auditoría vehicular más completa de México.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {advantages.map((a) => (
          <FeatureCard key={a.title} icon={a.icon} title={a.title} description={a.description} />
        ))}
      </div>
    </section>
  );
}

function ComparisonSection() {
  const rows: {
    label: string;
    carcheck: 'yes' | 'no' | 'partial' | string;
    carfax: 'yes' | 'no' | 'partial' | string;
    manual: 'yes' | 'no' | 'partial' | string;
  }[] = [
    { label: 'Número de fuentes consultadas', carcheck: '96', carfax: '~12', manual: '1-3' },
    { label: 'Cobertura de los 32 estados MX', carcheck: 'yes', carfax: 'partial', manual: 'no' },
    { label: 'Historial en Estados Unidos', carcheck: 'yes', carfax: 'partial', manual: 'no' },
    { label: 'Análisis interpretado con IA', carcheck: 'yes', carfax: 'no', manual: 'no' },
    { label: 'Autos chocolate (ANAM + NMVTIS)', carcheck: 'yes', carfax: 'no', manual: 'no' },
    { label: 'Verificación ambiental + multas', carcheck: 'yes', carfax: 'no', manual: 'partial' },
    { label: 'Tiempo de entrega', carcheck: '~15 seg', carfax: 'minutos', manual: 'días' },
    { label: 'Precio por reporte', carcheck: 'desde $199', carfax: '$300-600', manual: 'variable' },
    { label: 'PDF descargable', carcheck: 'yes', carfax: 'yes', manual: 'no' },
    { label: 'Link compartible', carcheck: 'yes', carfax: 'partial', manual: 'no' },
  ];
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">CarCheck vs. el resto</h2>
        <p className="text-lg text-muted-foreground">
          Comparado contra Carfax México y la verificación manual que haría un comprador por su
          cuenta. La diferencia es clara.
        </p>
      </div>
      <div className="max-w-4xl mx-auto overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left font-semibold p-4 min-w-[200px]">Característica</th>
              <th className="p-4 font-bold text-primary text-center">CarCheck</th>
              <th className="p-4 font-semibold text-muted-foreground text-center">Carfax México</th>
              <th className="p-4 font-semibold text-muted-foreground text-center">
                Verificación manual
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.label} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                <td className="p-4 font-medium">{row.label}</td>
                <td className="p-4 text-center bg-primary/5">
                  <ComparisonCell value={row.carcheck} highlight />
                </td>
                <td className="p-4 text-center">
                  <ComparisonCell value={row.carfax} />
                </td>
                <td className="p-4 text-center">
                  <ComparisonCell value={row.manual} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4">
        Comparativa estimada con base en cobertura pública de cada servicio a 2026.
      </p>
    </section>
  );
}

function ComparisonCell({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === 'yes') {
    return (
      <CheckCircle2
        className={`h-5 w-5 mx-auto ${highlight ? 'text-risk-green' : 'text-risk-green'}`}
      />
    );
  }
  if (value === 'no') {
    return <XCircle className="h-5 w-5 mx-auto text-risk-red" />;
  }
  if (value === 'partial') {
    return <MinusCircle className="h-5 w-5 mx-auto text-risk-yellow" />;
  }
  return (
    <span className={highlight ? 'font-bold text-foreground' : 'text-muted-foreground'}>
      {value}
    </span>
  );
}

function SampleFindingsSection() {
  const findings = [
    {
      icon: ShieldCheck,
      level: 'red' as const,
      tag: 'Bandera roja',
      title: 'Robo no reportado al vendedor',
      description:
        'El VIN aparece con reporte de robo activo en NICB / fiscalía estatal, aunque el vendedor jura que está limpio. La IA lo marca al instante y recomienda no avanzar.',
    },
    {
      icon: Gauge,
      level: 'red' as const,
      tag: 'Bandera roja',
      title: 'Rollback de odómetro',
      description:
        'El odómetro registrado en NMVTIS (US) marca 180,000 km y el tablero hoy muestra 95,000. Inconsistencia detectada al cruzar lecturas entre fuentes y fechas.',
    },
    {
      icon: FileWarning,
      level: 'red' as const,
      tag: 'Bandera roja',
      title: 'Título salvage oculto',
      description:
        'Importado de subasta Copart con título "salvage" por daño de inundación, regularizado en México sin declararlo. Cruzamos NMVTIS + Copart + fotos del lote.',
    },
    {
      icon: ScanLine,
      level: 'red' as const,
      tag: 'Bandera roja',
      title: 'Pedimento ausente o inválido',
      description:
        'Auto de procedencia extranjera sin pedimento de importación vigente en ANAM, o con folio que no coincide con el VIN. Riesgo legal serio para el comprador.',
    },
    {
      icon: AlertTriangle,
      level: 'yellow' as const,
      tag: 'Advertencia',
      title: 'Recall de fábrica sin atender',
      description:
        'NHTSA y el OEM reportan un llamado a revisión abierto (airbag, frenos) que nunca se reparó. La IA te dice cuál es y qué tan grave.',
    },
    {
      icon: CheckCircle2,
      level: 'green' as const,
      tag: 'Bandera verde',
      title: 'Historial limpio confirmado',
      description:
        'Sin robo, sin gravamen RUG, verificación ambiental al corriente, odómetro consistente y un solo dueño. La IA confirma que es una compra segura.',
    },
  ];
  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que la IA destapa</h2>
          <p className="text-lg text-muted-foreground">
            Ejemplos reales de hallazgos que CarCheck detecta cruzando fuentes — el tipo de
            problema que te cuesta cientos de miles de pesos si lo descubres después de comprar.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {findings.map((f) => (
            <FindingCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FindingCard({
  icon: Icon,
  level,
  tag,
  title,
  description,
}: {
  icon: typeof Sparkles;
  level: 'red' | 'yellow' | 'green';
  tag: string;
  title: string;
  description: string;
}) {
  const color =
    level === 'red'
      ? 'text-risk-red'
      : level === 'yellow'
        ? 'text-risk-yellow'
        : 'text-risk-green';
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{tag}</span>
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AudiencesSection() {
  const audiences = [
    {
      icon: Users,
      title: 'Compradores particulares',
      description:
        'Antes de pagar el enganche, sabe si el auto tiene robo, adeudos, recalls o un historial maquillado. Tu mejor inversión de $199 MXN.',
    },
    {
      icon: Building2,
      title: 'Lotes y agencias',
      description:
        'Audita tu inventario antes de comprarlo y muestra el reporte al cliente como sello de confianza. Precio por volumen desde $50 MXN.',
    },
    {
      icon: Store,
      title: 'Marketplaces',
      description:
        'Integra CarCheck por API white-label y ofrece reportes verificados en cada publicación. Menos fraude, más conversión.',
    },
    {
      icon: Landmark,
      title: 'Aseguradoras',
      description:
        'Valida estado, daño previo y título salvage antes de emitir póliza. Reduce siniestros fraudulentos con datos cruzados US + MX.',
    },
    {
      icon: Wallet,
      title: 'Fintechs de crédito auto',
      description:
        'Evalúa el colateral real antes de aprobar un crédito. Webhooks y SLA para integrarlo a tu flujo de originación.',
    },
  ];
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Para quién es CarCheck?</h2>
        <p className="text-lg text-muted-foreground">
          Desde quien compra su primer auto hasta plataformas que mueven miles de unidades al mes.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {audiences.map((a) => (
          <FeatureCard key={a.title} icon={a.icon} title={a.title} description={a.description} />
        ))}
      </div>
      <div className="text-center mt-10">
        <Link
          href="/sign-up"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Crear cuenta
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function SourcesGallerySection() {
  const categories = [
    {
      title: 'México federal',
      count: 13,
      sources: ['REPUVE', 'OCRA / AMIS', 'RUG', 'SAT CFDI', 'AMDA Papel Seguridad', 'ANAM Pediment', 'PROFECO Alertas', 'VUCEM', '+5'],
    },
    {
      title: 'México estatal',
      count: 42,
      sources: ['Los 32 estados', 'Fiscalías top 6', 'Verificación CDMX', 'Verificación EdoMex', 'Foto-cívicas', 'Foto-multas'],
    },
    {
      title: 'Estados Unidos',
      count: 21,
      sources: ['NMVTIS', 'NHTSA vPIC', 'NHTSA Recalls', 'NICB', 'AutoCheck', 'Carfax', 'Bumper', 'EpicVIN', 'ClearVin', 'MarketCheck', '+11'],
    },
    {
      title: 'OEM directo',
      count: 10,
      sources: ['Toyota', 'GM', 'Ford', 'Honda', 'Nissan', 'VW', 'BMW', 'Mercedes', 'Stellantis', 'Audi'],
    },
    {
      title: 'Subastas',
      count: 4,
      sources: ['Copart', 'IAA', 'Manheim', 'Stat.vin'],
    },
    {
      title: 'Mercado',
      count: 6,
      sources: ['Mercado Libre', 'Seminuevos', 'Kavak', 'Autocosmos', 'VinAudit Market', 'MarketCheck History'],
    },
  ];
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          96 fuentes en cada reporte
        </h2>
        <p className="text-lg text-muted-foreground">
          Más completa que cualquier alternativa en México. Cada fuente trae un dato distinto que
          la IA cruza para detectar fraude.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {categories.map((cat) => (
          <div key={cat.title} className="rounded-2xl border bg-card p-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-semibold text-lg">{cat.title}</h3>
              <span className="text-2xl font-bold text-primary">{cat.count}</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {cat.sources.map((src) => (
                <li key={src}>· {src}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-center mt-8">
        <Link href="/fuentes" className="text-primary hover:underline inline-flex items-center gap-1">
          Ver catálogo completo de fuentes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function ChocolateCarsSection() {
  return (
    <section className="bg-primary text-primary-foreground py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide opacity-80 mb-3">
              Para autos chocolate
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Está regularizado? ¿Su historial americano es limpio?
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Más de 3 millones de autos chocolate se regularizaron entre 2022 y 2025. Pero muchos
              esconden títulos "salvage" en Estados Unidos, robos no reportados o pedimentos
              falsos. CarCheck es el único reporte que cruza{' '}
              <strong>ANAM + NMVTIS + Copart + REPUVE</strong> en una sola consulta.
            </p>
            <Link
              href="/decode"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-foreground px-6 font-medium text-primary hover:opacity-90 transition-opacity"
            >
              Verificar mi auto chocolate
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3 text-sm">
            <ChocolateBullet text="Verifica pediment de importación vigente en ANAM" />
            <ChocolateBullet text="Detecta folio de regularización (decretos 2022-2025)" />
            <ChocolateBullet text="Revisa título americano (salvage, junk, flood, rebuilt)" />
            <ChocolateBullet text="Cruza con subastas (Copart, IAA) por fotos y daño" />
            <ChocolateBullet text="Encuentra reportes de robo NICB / NMVTIS" />
            <ChocolateBullet text="Compara historial de odómetro entre US y MX" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ChocolateBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function PricingPreviewSection() {
  return (
    <section className="container mx-auto px-4 py-20 max-w-5xl">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Precios honestos</h2>
        <p className="text-lg text-muted-foreground">
          Sin suscripciones. Pagas solo cuando consultas.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <PricingCard
          name="Esencial"
          price="$199"
          features={[
            '32 fuentes principales',
            'Reporte web + PDF',
            'Análisis IA básico',
            'Resultado en 15 segundos',
          ]}
        />
        <PricingCard
          name="Completo"
          price="$299"
          highlighted
          features={[
            'Las 96 fuentes',
            'Análisis IA premium (Claude Opus)',
            'Cross-source findings',
            'Recomendaciones accionables',
            'Preguntas para el vendedor',
          ]}
        />
        <PricingCard
          name="B2B / API"
          price="Custom"
          features={[
            'Volumen $50-100 MXN/reporte',
            'API white-label',
            'Webhooks',
            'SLA garantizado',
            'Onboarding dedicado',
          ]}
        />
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? 'rounded-2xl border-2 border-primary bg-card p-6 relative'
          : 'rounded-2xl border bg-card p-6'
      }
    >
      {highlighted ? (
        <span className="absolute -top-3 left-6 rounded-full bg-primary text-primary-foreground text-xs font-bold px-3 py-1">
          MÁS POPULAR
        </span>
      ) : null}
      <h3 className="font-semibold text-lg mb-1">{name}</h3>
      <p className="text-3xl font-bold mb-4">
        {price}
        {price.startsWith('$') ? <span className="text-base font-normal text-muted-foreground"> MXN</span> : null}
      </p>
      <ul className="space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-risk-green flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: '¿Es legal? ¿De dónde viene la información?',
      a: 'Todas las fuentes son oficiales y públicas o consultadas con convenios. REPUVE es un servicio público del SSPC, NHTSA es del gobierno US, los portales estatales son ciudadanos. Nunca exponemos el nombre del propietario (cumplimiento LFPDPPP MX + DPPA US).',
    },
    {
      q: '¿En qué se diferencia de Carfax México?',
      a: 'Carfax MX consulta principalmente NMVTIS y algunos estados. CarCheck consulta 96 fuentes (vs ~12 de Carfax), incluyendo los 32 estados de México, verificación ambiental, OEM directos y subastas. Además interpretamos los datos con Claude AI — no te dejamos un PDF con datos crudos para descifrar.',
    },
    {
      q: '¿Funciona para autos chocolate?',
      a: 'Es justamente nuestro caso fuerte. Cruzamos ANAM (pediment + regularización), NMVTIS (título americano), Copart/IAA (subastas con fotos del daño) y REPUVE (estatus en México) en un solo reporte. Ningún competidor en México hace esto.',
    },
    {
      q: '¿Cuánto tarda el reporte?',
      a: '10 a 15 segundos para el reporte completo. Las APIs (NHTSA, NMVTIS) responden en menos de 2 segundos. Los scrapers (REPUVE, OCRA, estados) corren en paralelo y son los que toman más tiempo.',
    },
    {
      q: '¿Qué pasa si una fuente falla?',
      a: 'El reporte se entrega igual. La sección correspondiente se marca como "no disponible" y la IA ajusta su nivel de confianza. Solo pagas por lo que entregamos.',
    },
    {
      q: '¿Tienen API para mi marketplace o agencia?',
      a: 'Sí. Ofrecemos API white-label con webhooks, volumen $50-100 MXN por reporte y SLA. Contáctanos para onboarding.',
    },
    {
      q: '¿Necesito el VIN o me sirve la placa?',
      a: 'Con cualquiera de los dos arrancamos. Si solo tienes la placa, resolvemos el VIN y de ahí consultamos todas las fuentes. Decodificar el VIN para ver marca, modelo, motor y planta de ensamble siempre es gratis en /decode.',
    },
    {
      q: '¿Qué incluye el análisis con IA exactamente?',
      a: 'Claude Opus 4.7 entrega un resumen ejecutivo, banderas rojas y verdes, hallazgos cruzados entre fuentes (por ejemplo odómetro US vs MX), recomendaciones accionables y una lista de preguntas concretas para hacerle al vendedor. No es un PDF de datos crudos: es un veredicto explicado.',
    },
    {
      q: '¿Qué diferencia hay entre el plan Esencial y el Completo?',
      a: 'Esencial ($199 MXN) consulta las 32 fuentes principales con análisis IA básico. Completo ($299 MXN) activa las 96 fuentes, el análisis premium con Claude Opus, los hallazgos cruzados y las preguntas para el vendedor. Para autos chocolate o de procedencia US recomendamos siempre el Completo.',
    },
    {
      q: '¿Puedo compartir o descargar el reporte?',
      a: 'Sí. Cada reporte tiene un PDF descargable y un link compartible que puedes mandar a tu mecánico, al vendedor o a tu aseguradora. El link no expone datos personales del propietario.',
    },
  ];
  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <HelpCircle className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border bg-card p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer font-semibold">
                {faq.q}
                <span className="text-primary group-open:rotate-45 transition-transform text-2xl leading-none">
                  +
                </span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto text-center rounded-3xl border-2 border-primary/20 bg-primary/5 p-12">
        <AlertTriangle className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          No compres un auto sin auditarlo
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Por $199 MXN sabes si vas a comprar el coche de tus sueños o el problema más caro de tu
          vida. Decodificación VIN siempre es gratis.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/decode"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-8 font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Probar gratis ahora
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/precios"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border bg-background px-8 font-medium hover:bg-muted transition-colors"
          >
            Ver precios
          </Link>
        </div>
      </div>
    </section>
  );
}
