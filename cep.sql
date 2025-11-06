create table ceps (
  id bigint generated always as identity primary key,
  logradouro text,
  bairro text,
  localidade text,
  cep text
);
    