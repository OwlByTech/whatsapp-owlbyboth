# Usa una imagen base de Node.js
FROM node:21

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de la aplicación al directorio de trabajo
COPY . .

# Instala las dependencias de la aplicación
RUN npm install

# Expone el puerto en el que corre la aplicación
EXPOSE 3008

# Define el comando para correr la aplicación
CMD ["npm", "run", "dev"]
