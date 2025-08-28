import React, { useMemo, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, AlertTriangle, LineChart as LineChartIcon, Database } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter
} from "recharts";
import { motion } from "framer-motion";

// --- Helpers ---
function parseCSV(file, onDone) {
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (res) => onDone(res.data)
  });
}

function stats(arr) {
  const n = arr.length;
  if (!n) return null;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1 || 1);
  const std = Math.sqrt(variance);
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  return { n, mean, std, min, max };
}

function pearson(x, y) {
  if (x.length !== y.length || !x.length) return null;
  const xm = x.reduce((a, b) => a + b, 0) / x.length;
  const ym = y.reduce((a, b) => a + b, 0) / y.length;
  let num = 0, xd = 0, yd = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - xm;
    const dy = y[i] - ym;
    num += dx * dy;
    xd += dx * dx;
    yd += dy * dy;
  }
  const den = Math.sqrt(xd * yd);
  if (den === 0) return 0;
  return num / den;
}

// --- Main Component ---
export default function GeoVizApp() {
  const [timeSeries, setTimeSeries] = useState(null); // array of rows
  const [borehole, setBorehole] = useState(null);     // array of rows
  const [thresholds, setThresholds] = useState({ rain: 30, disp: 8, pore: 60 });

  const alerts = useMemo(() => {
    if (!timeSeries) return [];
    return timeSeries.filter(r => (
      (r.rainfall_mm ?? 0) > thresholds.rain ||
      (r.displacement_mm ?? 0) > thresholds.disp ||
      (r.pore_pressure_kpa ?? 0) > thresholds.pore
    ));
  }, [timeSeries, thresholds]);

  const statsSummary = useMemo(() => {
    if (!timeSeries) return null;
    const rain = timeSeries.map(r => r.rainfall_mm).filter(v => typeof v === 'number');
    const disp = timeSeries.map(r => r.displacement_mm).filter(v => typeof v === 'number');
    const pore = timeSeries.map(r => r.pore_pressure_kpa).filter(v => typeof v === 'number');
    return {
      rain: stats(rain),
      disp: stats(disp),
      pore: stats(pore),
      corr_rain_disp: pearson(rain, disp),
      corr_rain_pore: pearson(rain, pore),
      corr_disp_pore: pearson(disp, pore),
    };
  }, [timeSeries]);

  const formattedTS = useMemo(() => {
    if (!timeSeries) return [];
    return timeSeries.map(r => ({
      ...r,
      timestamp: (r.timestamp && (new Date(r.timestamp)).toISOString().slice(0,10)) || r.timestamp
    }));
  }, [timeSeries]);

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">GeoViz – Análise e Visualização Geotécnica</h1>
          <p className="text-neutral-600">Protótipo acadêmico para o Tema 4: leitura de dados, gráficos interativos, estatísticas e alertas.</p>
        </header>

        <Tabs defaultValue="monitoramento" className="w-full">
          <TabsList>
            <TabsTrigger value="monitoramento" className="gap-2"><LineChartIcon className="w-4 h-4"/> Monitoramento</TabsTrigger>
            <TabsTrigger value="sondagem" className="gap-2"><Database className="w-4 h-4"/> Sondagem (SPT)</TabsTrigger>
          </TabsList>

          {/* MONITORAMENTO */}
          <TabsContent value="monitoramento" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Carregar séries temporais (CSV)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept=".csv" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) parseCSV(f, setTimeSeries);
                    }} />
                    <Button variant="secondary" asChild>
                      <a href="sandbox:/mnt/data/monitoring_timeseries.csv" download>Exemplo CSV</a>
                    </Button>
                  </div>
                  <p className="text-sm text-neutral-600 mt-2">Colunas esperadas: <code>timestamp,rainfall_mm,displacement_mm,pore_pressure_kpa</code></p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Limiares de Alerta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Chuva (mm/dia)</Label>
                    <Input type="number" value={thresholds.rain}
                      onChange={e => setThresholds({ ...thresholds, rain: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Deslocamento (mm)</Label>
                    <Input type="number" value={thresholds.disp}
                      onChange={e => setThresholds({ ...thresholds, disp: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Pressão de poros (kPa)</Label>
                    <Input type="number" value={thresholds.pore}
                      onChange={e => setThresholds({ ...thresholds, pore: Number(e.target.value) })} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {timeSeries && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Gráficos – chuva, deslocamento e pressão de poros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-80">
                      <ResponsiveContainer>
                        <LineChart data={formattedTS} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="rainfall_mm" name="Chuva (mm)" dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="displacement_mm" name="Deslocamento (mm)" dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="pore_pressure_kpa" name="Pressão de poros (kPa)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Dispersão: Chuva × Deslocamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-72">
                      <ResponsiveContainer>
                        <ScatterChart>
                          <CartesianGrid />
                          <XAxis dataKey="rainfall_mm" name="Chuva (mm)" />
                          <YAxis dataKey="displacement_mm" name="Deslocamento (mm)" />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter data={formattedTS} name="pontos" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    {statsSummary && (
                      <p className="text-sm text-neutral-700 mt-2">Correlação de Pearson (chuva × deslocamento): <b>{statsSummary.corr_rain_disp?.toFixed(2)}</b></p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo Estatístico</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {statsSummary ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {k: 'rain', label: 'Chuva (mm)'},
                          {k: 'disp', label: 'Deslocamento (mm)'},
                          {k: 'pore', label: 'Pressão de poros (kPa)'}
                        ].map(({k,label}) => (
                          <div key={k} className="bg-white p-3 rounded-2xl shadow">
                            <div className="font-medium mb-1">{label}</div>
                            <div>N: {statsSummary[k]?.n}</div>
                            <div>Média: {statsSummary[k]?.mean?.toFixed(2)}</div>
                            <div>Desv.: {statsSummary[k]?.std?.toFixed(2)}</div>
                            <div>Mín.: {statsSummary[k]?.min}</div>
                            <div>Máx.: {statsSummary[k]?.max}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Carregue um CSV para ver o resumo.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Alertas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {alerts.length ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="p-2">timestamp</th>
                              <th className="p-2">rainfall_mm</th>
                              <th className="p-2">displacement_mm</th>
                              <th className="p-2">pore_pressure_kpa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alerts.map((r, i) => (
                              <tr key={i} className="odd:bg-neutral-50">
                                <td className="p-2">{r.timestamp}</td>
                                <td className="p-2">{r.rainfall_mm}</td>
                                <td className="p-2">{r.displacement_mm}</td>
                                <td className="p-2">{r.pore_pressure_kpa}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p>Nenhum alerta conforme limiares atuais.</p>}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* SONDAGEM */}
          <TabsContent value="sondagem" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Carregar perfil de sondagem SPT (CSV)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept=".csv" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) parseCSV(f, setBorehole);
                    }} />
                    <Button variant="secondary" asChild>
                      <a href="sandbox:/mnt/data/borehole_profile.csv" download>Exemplo CSV</a>
                    </Button>
                  </div>
                  <p className="text-sm text-neutral-600 mt-2">Colunas esperadas: <code>depth_m,n_spt,moisture_pct,soil_type</code></p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ajuda</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Este módulo plota N-SPT e umidade ao longo da profundidade. A cor dos pontos segue o tipo de solo informado.</p>
                </CardContent>
              </Card>
            </div>

            {borehole && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Perfil N-SPT × Profundidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-80">
                      <ResponsiveContainer>
                        <LineChart data={borehole} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" dataKey="n_spt" />
                          <YAxis type="category" dataKey="depth_m" reversed tickFormatter={(v)=>`${v} m`} width={70} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="n_spt" name="N-SPT" dot />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Umidade × Profundidade (dispersão)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-80">
                      <ResponsiveContainer>
                        <ScatterChart layout="vertical">
                          <CartesianGrid />
                          <XAxis type="number" dataKey="moisture_pct" name="Umidade (%)" />
                          <YAxis type="category" dataKey="depth_m" name="Profundidade (m)" reversed width={70} />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter data={borehole} name="Perfil" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Tabela</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="p-2">depth_m</th>
                            <th className="p-2">n_spt</th>
                            <th className="p-2">moisture_pct</th>
                            <th className="p-2">soil_type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {borehole.map((r, i) => (
                            <tr key={i} className="odd:bg-neutral-50">
                              <td className="p-2">{r.depth_m}</td>
                              <td className="p-2">{r.n_spt}</td>
                              <td className="p-2">{r.moisture_pct}</td>
                              <td className="p-2">{r.soil_type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <footer className="mt-8 text-xs text-neutral-500">
          <p>Este protótipo é acadêmico e não substitui verificação e validação de engenharia.</p>
        </footer>
      </motion.div>
    </div>
  );
}
