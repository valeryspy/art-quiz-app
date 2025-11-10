FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN wget -O objects.csv https://github.com/NationalGalleryOfArt/opendata/raw/main/data/objects.csv
RUN wget -O published_images.csv https://github.com/NationalGalleryOfArt/opendata/raw/main/data/published_images.csv
RUN python process_data.py

EXPOSE 7860

CMD ["python", "server.py"]