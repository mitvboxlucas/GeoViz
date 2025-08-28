import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import os

# Configuração da página
st.set_page_config(page_title="GeoViz - Análise Geotécnica", layout="wide")

st.title("🌍 GeoViz - Análise e Visualização de Dados Geotécnicos")
st.write("Protótipo para TCC - Upload de dados CSV e geração de gráficos/alertas.")

# Caminho do arquivo de exemplo
arquivo_padrao = "dados_geotecnicos.csv"

# Verifica se o arquivo padrão existe
if os.path.exists(arquivo_padrao):
    df = pd.read_csv(arquivo_padrao)
    st.success(f"✅ Dados carregados automaticamente: `{arquivo_padrao}`")
else:
    # Se não existir, permite upload
    st.info("Nenhum dado automático encontrado. Faça upload de um arquivo CSV.")
    uploaded_file = st.file_uploader("📂 Faça upload do arquivo CSV", type=["csv"])
    if uploaded_file is not None:
        df = pd.read_csv(uploaded_file)
        st.success("Arquivo carregado com sucesso!")
    else:
        df = None  # Nenhum dado disponível

# Se temos dados (seja automático ou upload)
if df is not None:
    # Mostrar tabela
    st.subheader("📋 Dados brutos")
    st.dataframe(df.head(20))

    # Estatísticas
    st.subheader("📊 Estatísticas básicas")
    st.write(df.describe())

    # Selecionar colunas numéricas
    numeric_cols = df.select_dtypes(include=["float64", "int64"]).columns.tolist()
    if len(numeric_cols) >= 2:
        x_axis = st.selectbox("Eixo X", numeric_cols)
        y_axis = st.selectbox("Eixo Y", numeric_cols, index=1)

        fig, ax = plt.subplots()
        ax.plot(df[x_axis], df[y_axis], marker="o", linestyle="-")
        ax.set_xlabel(x_axis)
        ax.set_ylabel(y_axis)
        ax.set_title(f"{y_axis} vs {x_axis}")
        st.pyplot(fig)

    # Alertas
    st.subheader("🚨 Alertas")
    if "deslocamento_mm" in df.columns:
        max_disp = df["deslocamento_mm"].max()
        if max_disp > 30:
            st.error(f"⚠️ Deslocamento crítico detectado: {max_disp:.2f} mm")
        else:
            st.success(f"✅ Deslocamento dentro dos limites: {max_disp:.2f} mm")

    if "pressao_poros_kpa" in df.columns:
        max_pore = df["pressao_poros_kpa"].max()
        if max_pore > 60:
            st.error(f"⚠️ Pressão de poros crítica detectada: {max_pore:.2f} kPa")
        else:
            st.success(f"✅ Pressão de poros dentro dos limites: {max_pore:.2f} kPa")
else:
    st.warning("Carregue um arquivo CSV ou inclua `dados_geotecnicos.csv` na pasta para iniciar a análise.")