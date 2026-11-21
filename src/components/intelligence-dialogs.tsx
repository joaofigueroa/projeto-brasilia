"use client";
import { Download, FileUp, Info } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useId } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { periodLabel } from "@/libs/analysis-period";
import { analysisLabels, metricLabels, prospectLabels } from "@/libs/intelligence-presentation";
import type { IntelligenceData } from "@/types/intelligence";
import { Dialog } from "./dialog";
import { FormError, SubmitButton } from "./feedback";
export function IntelligenceDialogs({
  data,
  controller,
}: {
  data: IntelligenceData;
  controller: IntelligenceController;
}) {
  const id = useId();
  const record = controller.editor && controller.editor !== "new" ? controller.editor : null;
  const tab = controller.tabEditor && controller.tabEditor !== "new" ? controller.tabEditor : null;
  const segments = tab?.settings.segments ?? data.tab.settings.segments;
  return (
    <AnimatePresence>
      {controller.editor && (
        <Dialog
          key="record"
          title={record ? "Editar registro" : "Adicionar registro"}
          eyebrow={`${data.project.name} · ${record?.territoryLabel ?? data.territory.label} · ${record?.year ?? periodLabel(data.years)}`}
          onClose={controller.closeRecord}
        >
          <form onSubmit={controller.saveRecord} className="bi-editor-form">
            <div className="bi-dialog-body">
              <fieldset disabled={controller.pending}>
                <label className="field">
                  <span>Ano de referência do registro</span>
                  <select
                    name="year"
                    defaultValue={record?.year ?? data.year}
                    disabled={Boolean(record)}
                  >
                    {data.years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{data.tab.kind === "prospects" ? "Nome da organização" : "Título"}</span>
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={180}
                    defaultValue={record?.title}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Categoria / segmento</span>
                    <input
                      name="category"
                      list={`${id}-segments`}
                      maxLength={80}
                      defaultValue={record?.category}
                    />
                    <datalist id={`${id}-segments`}>
                      {data.tab.settings.segments.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </label>
                  <label className="field">
                    <span>Situação de abordagem</span>
                    <select name="status" defaultValue={record?.status ?? "new"}>
                      {Object.entries(prospectLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Tipo de indicador</span>
                  <select
                    name="metric"
                    defaultValue={
                      record?.metric ??
                      (data.tab.kind === "vehicles"
                        ? data.metric
                        : data.tab.kind === "market"
                          ? "market_size"
                          : "context")
                    }
                  >
                    {Object.entries(metricLabels)
                      .filter(
                        ([value]) =>
                          data.tab.kind !== "vehicles" ||
                          value === "sales" ||
                          value === "registrations",
                      )
                      .map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                  </select>
                  <small>
                    Vendas, emplacamentos e frota são medidas distintas. Use a definição da fonte.
                  </small>
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Valor (opcional para registro qualitativo)</span>
                    <input
                      name="value"
                      type="number"
                      min="0"
                      max="1000000000000000"
                      step="any"
                      defaultValue={record?.value ?? ""}
                    />
                  </label>
                  <label className="field">
                    <span>Unidade</span>
                    <input
                      name="unit"
                      defaultValue={
                        record?.unit ??
                        (data.tab.kind === "prospects"
                          ? "organizações"
                          : data.tab.kind === "vehicles"
                            ? "automóveis"
                            : "unidades")
                      }
                      maxLength={40}
                      placeholder="veículos, organizações, BRL…"
                    />
                  </label>
                </div>
                {data.tab.kind === "vehicles" && (
                  <>
                    <div className="bi-form-section-title">Características do veículo</div>
                    <div className="field-row">
                      <label className="field">
                        <span>Marca</span>
                        <input
                          name="make"
                          defaultValue={record?.details.make}
                          maxLength={100}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Modelo</span>
                        <input
                          name="model"
                          defaultValue={record?.details.model}
                          maxLength={100}
                          required
                        />
                      </label>
                    </div>
                    <div className="field-row">
                      <label className="field">
                        <span>Tipo de veículo</span>
                        <input name="vehicleType" value="Automóvel" readOnly maxLength={80} />
                      </label>
                      <label className="field">
                        <span>Ano de fabricação</span>
                        <input
                          name="manufactureYear"
                          defaultValue={record?.details.manufactureYear}
                          pattern="(19|20)[0-9]{2}"
                          placeholder="2022"
                          maxLength={4}
                        />
                        <small>
                          O ano de fabricação é uma característica do veículo. O ano do registro é
                          selecionado acima.
                        </small>
                      </label>
                    </div>
                  </>
                )}
                {data.tab.kind === "prospects" && (
                  <label className="field">
                    <span>Contato profissional / canal de abordagem</span>
                    <input name="contact" maxLength={200} defaultValue={record?.details.contact} />
                  </label>
                )}
                <div className="bi-form-section-title">Fonte e análise</div>
                <label className="field">
                  <span>Fonte</span>
                  <input
                    name="sourceName"
                    required
                    minLength={2}
                    maxLength={150}
                    defaultValue={record?.sourceName}
                    placeholder="Nome da base, publicação ou levantamento"
                  />
                </label>
                <label className="field">
                  <span>Endereço da fonte</span>
                  <input
                    name="sourceUrl"
                    type="url"
                    defaultValue={record?.sourceUrl}
                    placeholder="https://…"
                  />
                  <small>Obrigatório para indicadores quantitativos.</small>
                </label>
                <label className="field">
                  <span>
                    {data.tab.kind === "market"
                      ? "Premissas e método da estimativa"
                      : "Notas e próximos contatos"}
                  </span>
                  <textarea name="notes" rows={4} maxLength={10000} defaultValue={record?.notes} />
                </label>
              </fieldset>
              <FormError message={controller.error} />
            </div>
            <div className="dialog-footer">
              <button type="button" className="button secondary" onClick={controller.closeRecord}>
                Cancelar
              </button>
              <SubmitButton pending={controller.pending}>Salvar registro</SubmitButton>
            </div>
          </form>
        </Dialog>
      )}
      {controller.tabEditor && (
        <Dialog
          key="tab"
          title={tab ? "Configurar aba" : "Adicionar aba"}
          eyebrow={data.project.name}
          variant="modal"
          onClose={controller.closeTab}
        >
          <form className="bi-editor-form" onSubmit={controller.saveTab}>
            <div className="bi-dialog-body">
              <fieldset disabled={controller.pending}>
                <label className="field">
                  <span>Nome da aba</span>
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    defaultValue={tab?.name}
                  />
                </label>
                <label className="field">
                  <span>Tipo de análise</span>
                  <select name="kind" defaultValue={tab?.kind ?? "notes"} disabled={Boolean(tab)}>
                    {Object.entries(analysisLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {tab && (
                    <>
                      <input type="hidden" name="kind" value={tab.kind} />
                      <small>Para outro tipo de análise, adicione uma aba.</small>
                    </>
                  )}
                </label>
                <label className="field">
                  <span>Segmentos (separados por vírgula)</span>
                  <textarea
                    name="segments"
                    rows={3}
                    defaultValue={segments.join(", ")}
                    placeholder="Supermercados, boutiques de vinhos…"
                  />
                </label>
                <label className="field">
                  <span>Termos para consultar editais (separados por vírgula)</span>
                  <textarea
                    name="keywords"
                    rows={3}
                    defaultValue={(tab?.settings.keywords ?? data.tab.settings.keywords).join(", ")}
                  />
                </label>
                <p className="bi-form-note">
                  <Info size={15} />
                  Esta configuração pertence ao projeto {data.project.name}. As outras abas e
                  projetos mantêm suas próprias configurações.
                </p>
              </fieldset>
              <FormError message={controller.error} />
            </div>
            <div className="dialog-footer">
              <button type="button" className="button secondary" onClick={controller.closeTab}>
                Cancelar
              </button>
              <SubmitButton pending={controller.pending}>Salvar aba</SubmitButton>
            </div>
          </form>
        </Dialog>
      )}
      {controller.importing && (
        <Dialog
          key="import"
          title="Importar registros"
          eyebrow={`${data.project.name} · ${data.territory.label} · ${periodLabel(data.years)}`}
          onClose={controller.closeImport}
        >
          <form onSubmit={controller.importCsv} className="bi-editor-form">
            <div className="bi-dialog-body">
              <label className="field">
                <span>Ano dos registros do lote</span>
                <select name="year" defaultValue={data.year}>
                  {data.years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <small>
                  Cada lote usa um ano de referência. Importe um lote por ano para comparar o
                  período.
                </small>
              </label>
              <p className="bi-import-explanation">
                As linhas serão associadas à aba “{data.tab.name}”, ao território e ao ano
                selecionados. Até 500 linhas e 500 KB por arquivo.
              </p>
              <a className="button secondary" href="/templates/intelligence-records.csv" download>
                <Download size={16} />
                Baixar modelo CSV
              </a>
              <label className="field bi-file-field">
                <span>
                  <FileUp size={17} />
                  Arquivo CSV UTF-8
                </span>
                <input
                  name="file"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={controller.pending}
                />
              </label>
              <label className="field">
                <span>Ou cole o conteúdo CSV</span>
                <textarea
                  name="csv"
                  rows={6}
                  maxLength={512000}
                  disabled={controller.pending}
                  placeholder="title,source_name,source_url,metric,value"
                />
                <small>
                  Selecione um arquivo ou cole o CSV completo, incluindo o cabeçalho. Se houver
                  arquivo, ele será usado.
                </small>
              </label>
              <div className="bi-import-columns">
                <strong>Colunas obrigatórias</strong>
                <code>title, source_name</code>
                <p>
                  Para quantidades, informe também metric, value e source_url. Use metric = fleet,
                  sales, registrations ou market_size. Registros qualitativos usam context.
                </p>
                <strong>Características de veículos</strong>
                <code>make, model, vehicle_type, manufacture_year</code>
                <p>
                  Ano de fabricação não altera o ano de referência selecionado. Na visão de modelos,
                  use vehicle_type = Automóvel, com make, model e metric = sales ou registrations.
                </p>
              </div>
              <p className="bi-form-note">
                <Info size={15} />
                Reimportar o mesmo registro da mesma fonte atualiza o valor e as notas, sem
                duplicá-lo. Confira o modelo antes de importar.
              </p>
              <FormError message={controller.error} />
            </div>
            <div className="dialog-footer">
              <button className="button secondary" type="button" onClick={controller.closeImport}>
                Cancelar
              </button>
              <SubmitButton pending={controller.pending}>Importar CSV</SubmitButton>
            </div>
          </form>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
